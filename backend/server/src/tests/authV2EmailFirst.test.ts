import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  InMemoryAuthChallengeRepository,
  InMemoryAuthRateLimitRepository,
  InMemorySessionRepository,
  InMemoryUserIdentifierRepository,
  InMemoryUserRepository,
} from '../services/authV2Repository.js';
import { AuthV2Service } from '../services/authV2Service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXED_OTP = '654321';
const HMAC_SECRET = 'email_first_test_hmac_secret_32_chars!';

function createFixture() {
  const userIdentifierRepo = new InMemoryUserIdentifierRepository();
  const challengeRepo = new InMemoryAuthChallengeRepository();
  const rateLimitRepo = new InMemoryAuthRateLimitRepository();
  const userRepo = new InMemoryUserRepository();
  const sessionRepo = new InMemorySessionRepository();
  const service = new AuthV2Service({
    userIdentifierRepo,
    challengeRepo,
    rateLimitRepo,
    userRepo,
    sessionRepo,
    config: {
      deliveryMode: 'DEVELOPMENT_FIXED_OTP',
      developmentOtp: FIXED_OTP,
      hmacSecret: HMAC_SECRET,
      authEnv: 'test',
    },
  });
  return { service, userIdentifierRepo, challengeRepo, userRepo, sessionRepo };
}

async function issueVerify(service: AuthV2Service, method: 'PHONE' | 'EMAIL', identifier: string, intent: 'LOGIN' | 'CREATE_ACCOUNT' = 'CREATE_ACCOUNT') {
  const issued = await service.requestChallenge({ surface: 'CUSTOMER', intent, method, identifier });
  return service.verifyChallenge({ challengeId: issued.challengeId, otp: FIXED_OTP });
}

async function run() {
  const migrationPath = path.resolve(__dirname, '../../../database/migrations/032_customer_email_first_nullable_phone.sql');
  const migration = fs.readFileSync(migrationPath, 'utf8');
  assert.match(migration, /ALTER\s+TABLE\s+public\.users\s+ALTER\s+COLUMN\s+phone_number\s+DROP\s+NOT\s+NULL/i, 'migration 032 must make only users.phone_number nullable');
  assert.doesNotMatch(migration, /ALTER\s+TABLE\s+public\.owners[\s\S]*phone_number\s+DROP\s+NOT\s+NULL/i, 'Owner phone must remain mandatory');
  assert.match(migration, /032_customer_email_first_nullable_phone\.sql/, 'migration 032 must record its schema version');
  assert.match(migration, /konfrm_create_email_customer_v2/i, 'migration 032 must provide the atomic email-only registration RPC');
  assert.match(migration, /pg_advisory_xact_lock/i, 'atomic email registration must serialize the same normalized email');
  assert.match(migration, /REVOKE\s+ALL\s+ON\s+FUNCTION[\s\S]*konfrm_create_email_customer_v2[\s\S]*FROM\s+PUBLIC,\s*anon,\s*authenticated/i, 'email registration RPC must not be directly executable by public app roles');
  assert.match(migration, /GRANT\s+EXECUTE\s+ON\s+FUNCTION[\s\S]*konfrm_create_email_customer_v2[\s\S]*TO\s+service_role/i, 'email registration RPC must be service-role only');

  {
    const { service, userIdentifierRepo } = createFixture();
    const verified = await issueVerify(service, 'EMAIL', 'Founder.New@Example.COM');
    assert.strictEqual(verified.isExistingUser, false);
    assert.strictEqual(verified.method, 'EMAIL');
    assert.ok(verified.continuationToken, 'new verified email must receive a continuation token');

    const completed = await service.completeAccountCreation({
      continuationToken: verified.continuationToken!,
      fullName: 'Founder Email User',
    });
    assert.strictEqual(completed.user.phoneNumber ?? null, null, 'email-only Customer must not receive a fake phone');
    assert.strictEqual(completed.user.email, 'Founder.New@example.com', 'verified normalized email must be canonical on users row');
    assert.ok(completed.tokens.accessToken && completed.tokens.refreshToken, 'email-only completion must issue canonical tokens');

    const identifiers = await userIdentifierRepo.getByUserId(completed.user.id);
    assert.strictEqual(identifiers.length, 1);
    assert.strictEqual(identifiers[0].identifierType, 'EMAIL');
    assert.strictEqual(identifiers[0].normalizedValue, 'Founder.New@example.com');
    assert.ok(identifiers[0].verifiedAt);

    await assert.rejects(
      () => service.completeAccountCreation({ continuationToken: verified.continuationToken!, fullName: 'Replay' }),
      /CONTINUATION_ALREADY_CONSUMED|CHALLENGE_NOT_VERIFIED/,
      'email registration continuation must remain single-use',
    );
  }

  {
    const { service, userRepo, userIdentifierRepo } = createFixture();
    const existing = await userRepo.create({
      id: '11111111-1111-4111-8111-111111111111',
      phoneNumber: null,
      email: 'existing@example.com',
      fullName: 'Existing Email User',
      status: 'ACTIVE',
    });
    await userIdentifierRepo.create({
      userId: existing.id,
      identifierType: 'EMAIL',
      normalizedValue: 'existing@example.com',
      verifiedAt: new Date().toISOString(),
    });

    const verified = await issueVerify(service, 'EMAIL', 'existing@example.com', 'CREATE_ACCOUNT');
    assert.strictEqual(verified.isExistingUser, true, 'CREATE_ACCOUNT with an existing verified email must authenticate existing user');
    assert.strictEqual(verified.user.id, existing.id);
    assert.ok(verified.tokens?.accessToken);
  }

  {
    const { service } = createFixture();
    const verified = await issueVerify(service, 'PHONE', '01012345678');
    assert.ok(verified.continuationToken);
    const completed = await service.completeAccountCreation({ continuationToken: verified.continuationToken!, fullName: 'Phone User' });
    assert.strictEqual(completed.user.phoneNumber, '+201012345678');
    assert.strictEqual(completed.user.email ?? null, null);
    assert.ok(completed.user.phoneVerifiedAt, 'phone registration must still mark phone verified');
  }

  {
    const { service, userRepo, userIdentifierRepo } = createFixture();
    const verified = await issueVerify(service, 'EMAIL', 'race@example.com');
    assert.ok(verified.continuationToken);

    const winner = await userRepo.create({
      id: '22222222-2222-4222-8222-222222222222',
      phoneNumber: null,
      email: 'race@example.com',
      fullName: 'Race Winner',
      status: 'ACTIVE',
    });
    await userIdentifierRepo.create({
      userId: winner.id,
      identifierType: 'EMAIL',
      normalizedValue: 'race@example.com',
      verifiedAt: new Date().toISOString(),
    });

    const completed = await service.completeAccountCreation({ continuationToken: verified.continuationToken!, fullName: 'Should Not Duplicate' });
    assert.strictEqual(completed.user.id, winner.id, 'registration race must resolve to canonical identifier owner');
  }

  {
    const { service } = createFixture();
    const first = await issueVerify(service, 'EMAIL', 'concurrent@example.com');
    const second = await issueVerify(service, 'EMAIL', 'concurrent@example.com');
    assert.ok(first.continuationToken && second.continuationToken);

    const results = await Promise.all([
      service.completeAccountCreation({ continuationToken: first.continuationToken!, fullName: 'Concurrent One' }),
      service.completeAccountCreation({ continuationToken: second.continuationToken!, fullName: 'Concurrent Two' }),
    ]);
    assert.strictEqual(results[0].user.id, results[1].user.id, 'two independently verified continuations for the same email must converge on one canonical user');
  }

  console.log('AUTH V2 EMAIL-FIRST focused contract tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
