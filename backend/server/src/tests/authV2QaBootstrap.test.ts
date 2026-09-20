/**
 * KONFRM Auth V2 QA bootstrap contract.
 *
 * Runs only against a disposable local PostgreSQL database. It creates no
 * Supabase project and never connects to a remote/Supabase production target.
 */

import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { AuthService } from '../services/authService.js';
import {
  PostgresAuthChallengeRepository,
  PostgresAuthRateLimitRepository,
  PostgresUserIdentifierRepository,
  hashRefreshToken,
} from '../services/authV2Repository.js';
import { AuthV2Service } from '../services/authV2Service.js';
import { computeChallengeOtpDigest } from '../services/otpSecurity.js';
import { sessionDb, userDb } from '../services/dbRepository.js';
import { assertSafeTestDatabaseUrl, isProductionDatabase } from '../utils/testDbGuard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ISOLATED_PG_URL = process.env.ISOLATED_PG_URL || 'postgresql://postgres:postgres@127.0.0.1:54329/sola_auth_v2_qa_test';
const QA_ACCESS_SECRET = 'qa-bootstrap-access-secret-not-a-production-secret-32';
const QA_REFRESH_SECRET = 'qa-bootstrap-refresh-secret-not-a-production-secret-32';
const QA_HMAC_SECRET = 'qa-bootstrap-hmac-secret-not-a-production-secret-32';
const QA_FIXED_OTP = '123456';

type Result = { name: string; passed: boolean; error?: string };

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
}

async function expectRejected(action: () => Promise<unknown>, message: string): Promise<void> {
  await assert.rejects(action, undefined, message);
}

async function createLocalRoles(client: pg.PoolClient): Promise<void> {
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
    END
    $$;
    ALTER ROLE service_role BYPASSRLS;
  `);
}

async function assertOrdinaryRoleDenied(client: pg.PoolClient, role: 'anon' | 'authenticated'): Promise<void> {
  await client.query(`SET ROLE ${role}`);
  try {
    await expectRejected(
      () => client.query('SELECT id FROM public.auth_challenges LIMIT 1'),
      `${role} must not read Auth V2 tables`,
    );
    await expectRejected(
      () => client.query(`INSERT INTO public.auth_rate_limits (bucket_key, window_start) VALUES ('forbidden', NOW())`),
      `${role} must not write Auth V2 tables`,
    );
    await expectRejected(
      () => client.query('SELECT * FROM public.konfrm_check_rate_limit_v2($1, $2, $3)', ['forbidden', 60, 1]),
      `${role} must not execute restricted Auth V2 RPCs`,
    );
  } finally {
    await client.query('RESET ROLE');
  }
}

export async function runAuthV2QaBootstrapSuite(): Promise<{ total: number; passed: number; failed: number; results: Result[] }> {
  const results: Result[] = [];
  const record = async (name: string, action: () => Promise<void>): Promise<void> => {
    try {
      await action();
      results.push({ name, passed: true });
    } catch (error: any) {
      results.push({ name, passed: false, error: error?.message || String(error) });
    }
  };

  assertSafeTestDatabaseUrl(ISOLATED_PG_URL, 'AuthV2QaBootstrap');
  if (isProductionDatabase()) {
    throw new Error('REFUSING_TEST_EXECUTION_AGAINST_PRODUCTION_DB');
  }

  const originalEnv = {
    databaseUrl: process.env.DATABASE_URL,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseSecret: process.env.SUPABASE_SECRET_KEY,
    supabaseService: process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV,
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
  };

  process.env.DATABASE_URL = ISOLATED_PG_URL;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = QA_ACCESS_SECRET;
  process.env.JWT_REFRESH_SECRET = QA_REFRESH_SECRET;

  const pool = new pg.Pool({ connectionString: ISOLATED_PG_URL, max: 16, connectionTimeoutMillis: 5000 });

  try {
    await record('Fresh empty start: public schema is reset only after the local-target guard passes', async () => {
      const client = await pool.connect();
      try {
        await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
        const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        assert.strictEqual(tables.rows.length, 0, 'QA database must begin with an empty public schema');
        await createLocalRoles(client);
      } finally {
        client.release();
      }
    });

    await record('QA baseline: applies outside migrations with no fabricated migration history', async () => {
      const baselinePath = path.resolve(__dirname, '../../../database/qa_baseline.sql');
      const baseline = fs.readFileSync(baselinePath, 'utf8');
      assert.match(baseline, /AUTH_QA_MINIMAL_BASELINE/);
      assert.match(baseline, /DO NOT APPLY TO PRODUCTION/);
      assert.ok(!baseline.includes("INSERT INTO public.schema_migrations"), 'QA baseline must not represent fake migration history');
      assert.ok(!baseline.includes('CREATE ROLE anon'), 'Supabase roles must not be created by QA baseline');
      assert.ok(!baseline.includes('CREATE TABLE IF NOT EXISTS public.bookings'), 'QA baseline must exclude unrelated domains');

      const client = await pool.connect();
      try {
        await client.query(baseline);
        const history = await client.query('SELECT version FROM public.schema_migrations');
        assert.strictEqual(history.rows.length, 0, 'baseline must not record historic migration versions');
      } finally {
        client.release();
      }
    });

    await record('Pre-031 structure: AUTH_CRITICAL_STRUCTURAL_EQUIVALENCE with EXPECTED_QA_SECURITY_HARDENING', async () => {
      const client = await pool.connect();
      try {
        const columns = await client.query(`
          SELECT table_name, column_name, data_type, is_nullable, column_default, character_maximum_length
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name IN ('schema_migrations', 'users', 'owners', 'user_sessions')
        `);
        const column = (table: string, name: string) => columns.rows.find((r) => r.table_name === table && r.column_name === name);
        assert.strictEqual(column('schema_migrations', 'version')?.character_maximum_length, 100);
        assert.strictEqual(column('users', 'id')?.data_type, 'uuid');
        assert.strictEqual(column('users', 'phone_number')?.data_type, 'character varying');
        assert.strictEqual(column('users', 'phone_number')?.is_nullable, 'NO');
        assert.match(String(column('users', 'status')?.column_default), /ACTIVE/);
        assert.strictEqual(column('owners', 'owner_onboarding_completed_at')?.data_type, 'timestamp with time zone');
        assert.match(String(column('owners', 'id')?.column_default), /gen_random_uuid\(\)/i);
        assert.strictEqual(column('user_sessions', 'user_id')?.is_nullable, 'NO');
        assert.strictEqual(column('user_sessions', 'owner_id')?.is_nullable, 'YES');
        assert.strictEqual(column('user_sessions', 'refresh_token_hash')?.is_nullable, 'NO');
        assert.strictEqual(column('user_sessions', 'surface')?.is_nullable, 'NO');
        assert.strictEqual(column('user_sessions', 'role')?.is_nullable, 'NO');
        assert.strictEqual(column('user_sessions', 'updated_at')?.is_nullable, 'NO');

        const constraints = await client.query(`
          SELECT conname, pg_get_constraintdef(c.oid) AS definition
          FROM pg_constraint c
          JOIN pg_namespace n ON n.oid = c.connamespace
          WHERE n.nspname = 'public'
            AND c.conrelid IN ('public.users'::regclass, 'public.owners'::regclass, 'public.user_sessions'::regclass)
        `);
        const definition = (name: string) => String(constraints.rows.find((r) => r.conname === name)?.definition || '');
        assert.match(definition('owners_id_fkey'), /ON DELETE RESTRICT/);
        assert.match(definition('user_sessions_owner_user_same_uuid_check'), /owner_id IS NULL/);
        assert.match(definition('user_sessions_owner_user_same_uuid_check'), /owner_id = user_id/);
        assert.match(definition('user_sessions_owner_role_requires_owner_check'), /ROLE_OWNER/);

        const indexes = await client.query(`SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('users', 'owners', 'user_sessions')`);
        const names = new Set(indexes.rows.map((r) => r.indexname));
        const expectedIndexes = new Set([
          'users_pkey', 'users_phone_number_key', 'idx_users_phone', 'idx_users_status',
          'owners_pkey', 'owners_phone_number_key',
          'user_sessions_pkey', 'uq_user_sessions_refresh_token_hash', 'idx_user_sessions_active_user_surface',
          'idx_user_sessions_owner', 'idx_user_sessions_refresh_token_hash',
        ]);
        assert.deepStrictEqual([...names].sort(), [...expectedIndexes].sort(), 'Auth-critical index set must match the approved equivalence contract');
        assert.ok(!names.has('idx_owners_phone'), 'QA baseline must not invent an owners phone index');

        const rls = await client.query(`SELECT relname, relrowsecurity FROM pg_class WHERE oid IN ('public.schema_migrations'::regclass, 'public.users'::regclass, 'public.owners'::regclass, 'public.user_sessions'::regclass)`);
        assert.ok(rls.rows.every((r) => r.relrowsecurity === true), 'baseline tables must have RLS enabled');

        const grants = await client.query(`
          SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
          WHERE table_schema = 'public' AND table_name IN ('users', 'owners', 'user_sessions')
        `);
        assert.ok(grants.rows.some((r) => r.grantee === 'service_role' && r.table_name === 'user_sessions' && r.privilege_type === 'INSERT'));
        // Production ACLs are broader, but the dedicated QA baseline intentionally
        // hardens Auth persistence exposure. This is EXPECTED_QA_SECURITY_HARDENING,
        // not a claim of byte-for-byte production ACL equality.
        assert.ok(!grants.rows.some((r) => (r.grantee === 'anon' || r.grantee === 'authenticated') && r.privilege_type !== ''));

        const ownerUserId = randomUUID();
        const otherUserId = randomUUID();
        await client.query(
          `INSERT INTO public.users (id, phone_number, full_name) VALUES
            ($1, '+201011110010', 'Synthetic Owner'),
            ($2, '+201011110011', 'Synthetic Customer')`,
          [ownerUserId, otherUserId],
        );
        await client.query(
          `INSERT INTO public.owners (id, phone_number, full_name) VALUES ($1, '+201011110010', 'Synthetic Owner')`,
          [ownerUserId],
        );
        await client.query(
          `INSERT INTO public.user_sessions (id, user_id, owner_id, surface, role, refresh_token_hash, expires_at)
          VALUES ($1, $2, $2, 'OWNER', 'ROLE_OWNER', 'qa-unique-refresh-hash', NOW() + interval '1 day')`,
          [randomUUID(), ownerUserId],
        );
        await expectRejected(
          () => client.query(`INSERT INTO public.user_sessions (id, user_id, owner_id, surface, role, refresh_token_hash, expires_at) VALUES ($1, $2, $3, 'OWNER', 'ROLE_OWNER', 'qa-owner-mismatch', NOW() + interval '1 day')`, [randomUUID(), otherUserId, ownerUserId]),
          'ROLE_OWNER session must use the matching Owner capability UUID',
        );
        await expectRejected(
          () => client.query(`INSERT INTO public.user_sessions (id, user_id, owner_id, surface, role, refresh_token_hash, expires_at) VALUES ($1, $2, NULL, 'OWNER', 'ROLE_OWNER', 'qa-owner-missing', NOW() + interval '1 day')`, [randomUUID(), otherUserId]),
          'ROLE_OWNER session must require an Owner capability',
        );
        await expectRejected(
          () => client.query(`INSERT INTO public.user_sessions (id, user_id, surface, role, refresh_token_hash, expires_at) VALUES ($1, $2, 'CUSTOMER', 'ROLE_CUSTOMER', 'qa-unique-refresh-hash', NOW() + interval '1 day')`, [randomUUID(), otherUserId]),
          'refresh token hash must be unique',
        );
      } finally {
        client.release();
      }
    });

    await record('Migration 031: applies unchanged, records only itself, and creates restricted Auth V2 structures', async () => {
      const migrationPath = path.resolve(__dirname, '../../../database/migrations/031_auth_v2_identity_and_challenges.sql');
      const migration = fs.readFileSync(migrationPath, 'utf8');
      assert.match(migration, /031_auth_v2_identity_and_challenges\.sql/);
      const client = await pool.connect();
      try {
        await client.query(migration);
        const history = await client.query('SELECT version FROM public.schema_migrations ORDER BY version');
        assert.deepStrictEqual(history.rows.map((r) => r.version), ['031_auth_v2_identity_and_challenges.sql']);
        const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user_identifiers', 'auth_challenges', 'auth_rate_limits')`);
        assert.deepStrictEqual(new Set(tables.rows.map((r) => r.table_name)), new Set(['user_identifiers', 'auth_challenges', 'auth_rate_limits']));
        const functions = await client.query(`SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE 'konfrm_%auth_challenge_v2' OR pronamespace = 'public'::regnamespace AND proname IN ('konfrm_check_rate_limit_v2', 'konfrm_acquire_resend_lease_v2', 'konfrm_commit_resend_v2', 'konfrm_release_resend_lease_v2')`);
        assert.ok(functions.rows.length >= 5, 'required Auth V2 RPCs must exist');
      } finally {
        client.release();
      }
    });

    await record('Auth V2 security: ordinary roles are denied while local service_role can use the restricted path', async () => {
      const client = await pool.connect();
      try {
        await assertOrdinaryRoleDenied(client, 'anon');
        await assertOrdinaryRoleDenied(client, 'authenticated');
        await client.query('SET ROLE service_role');
        try {
          const allowed = await client.query('SELECT * FROM public.konfrm_check_rate_limit_v2($1, $2, $3)', [`qa-service-${randomUUID()}`, 60, 1]);
          assert.strictEqual(allowed.rows[0].allowed, true);
        } finally {
          await client.query('RESET ROLE');
        }
      } finally {
        client.release();
      }
    });

    await record('Actual repositories: PHONE/EMAIL lookup, challenge persistence, rate-limit persistence, and no plaintext OTP', async () => {
      const client = await pool.connect();
      const userId = randomUUID();
      try {
        await client.query(`INSERT INTO public.users (id, phone_number, full_name) VALUES ($1, $2, 'Synthetic QA User')`, [userId, '+201011110001']);
      } finally {
        client.release();
      }

      const identifiers = new PostgresUserIdentifierRepository();
      const challenges = new PostgresAuthChallengeRepository();
      const rates = new PostgresAuthRateLimitRepository();
      await identifiers.create({ userId, identifierType: 'PHONE', normalizedValue: '+201011110001', verifiedAt: new Date().toISOString() });
      await identifiers.create({ userId, identifierType: 'EMAIL', normalizedValue: 'qa-user@example.test', verifiedAt: new Date().toISOString() });
      assert.strictEqual((await identifiers.getByIdentifier('PHONE', '+201011110001'))?.userId, userId);
      assert.strictEqual((await identifiers.getByIdentifier('EMAIL', 'qa-user@example.test'))?.userId, userId);

      const challengeId = randomUUID();
      const digest = computeChallengeOtpDigest(QA_HMAC_SECRET, challengeId, 1, '+201011110001', QA_FIXED_OTP);
      await challenges.create({
        id: challengeId, surface: 'CUSTOMER', intent: 'LOGIN', method: 'PHONE', normalizedValue: '+201011110001', otpDigest: digest,
        otpExpiresAt: new Date(Date.now() + 300000).toISOString(), challengeExpiresAt: new Date(Date.now() + 600000).toISOString(), resendAvailableAt: new Date(Date.now() - 1000).toISOString(),
      });
      assert.strictEqual((await challenges.getById(challengeId))?.otpDigest, digest);
      const rateBucket = `qa-rate-${randomUUID()}`;
      const firstRate = await rates.checkAndIncrement(rateBucket, 60, 1);
      const secondRate = await rates.checkAndIncrement(rateBucket, 60, 1);
      assert.strictEqual(firstRate.allowed, true);
      assert.strictEqual(secondRate.allowed, false, 'same bucket must persist and reject the next request at its limit');
      const noPlaintext = await pool.query('SELECT otp_digest FROM public.auth_challenges WHERE id = $1', [challengeId]);
      assert.notStrictEqual(noPlaintext.rows[0].otp_digest, QA_FIXED_OTP);
      const migration = readRepoFile('../../../database/migrations/031_auth_v2_identity_and_challenges.sql');
      const baseline = readRepoFile('../../../database/qa_baseline.sql');
      assert.ok(!migration.includes(QA_FIXED_OTP), 'Migration schema must not contain a fixed OTP');
      assert.ok(!baseline.includes('zrbmbjgcsowfqklmxbyn') && !migration.includes('zrbmbjgcsowfqklmxbyn'), 'QA artifacts must not contain a production project reference');
    });

    await record('Actual PostgreSQL concurrency: verify, resend lease, and consume have exactly one winner', async () => {
      const challenges = new PostgresAuthChallengeRepository();
      const verifyId = randomUUID();
      const verifyDigest = computeChallengeOtpDigest(QA_HMAC_SECRET, verifyId, 1, '+201011110001', QA_FIXED_OTP);
      await challenges.create({ id: verifyId, surface: 'CUSTOMER', intent: 'LOGIN', method: 'PHONE', normalizedValue: '+201011110001', otpDigest: verifyDigest, otpExpiresAt: new Date(Date.now() + 300000).toISOString(), challengeExpiresAt: new Date(Date.now() + 600000).toISOString(), resendAvailableAt: new Date(Date.now() - 1000).toISOString() });
      const verifyResults = await Promise.all(Array.from({ length: 5 }, () => challenges.atomicVerify(verifyId, verifyDigest)));
      assert.strictEqual(verifyResults.filter((result) => result.success).length, 1, 'verification must have one database winner');

      const consumeResults = await Promise.allSettled(Array.from({ length: 5 }, () => challenges.markConsumed(verifyId)));
      assert.strictEqual(consumeResults.filter((result) => result.status === 'fulfilled').length, 1, 'challenge consumption must have one database winner');
      assert.ok(consumeResults.filter((result) => result.status === 'rejected').every((result) => String((result as PromiseRejectedResult).reason?.message).includes('CONTINUATION_ALREADY_CONSUMED')));

      const resendId = randomUUID();
      await challenges.create({ id: resendId, surface: 'CUSTOMER', intent: 'LOGIN', method: 'PHONE', normalizedValue: '+201011110001', otpDigest: 'digest-before-resend', otpExpiresAt: new Date(Date.now() + 300000).toISOString(), challengeExpiresAt: new Date(Date.now() + 600000).toISOString(), resendAvailableAt: new Date(Date.now() - 1000).toISOString() });
      const leases = await Promise.all(Array.from({ length: 5 }, () => challenges.acquireResendLease(resendId, 30)));
      const winner = leases.filter((lease) => lease.success);
      assert.strictEqual(winner.length, 1, 'resend lease must have one database winner');
      await challenges.releaseResendLease(resendId, winner[0].leaseToken!);
      const secondLease = await challenges.acquireResendLease(resendId, 30);
      assert.strictEqual(secondLease.success, true);
      const committed = await challenges.commitResend(resendId, secondLease.leaseToken!, 'digest-after-resend', 2, 60);
      assert.strictEqual(committed.success, true);
    });

    await record('Actual Auth V2 service and canonical session path: continuation replay rejects; persisted session refreshes then revokes', async () => {
      const identifiers = new PostgresUserIdentifierRepository();
      const challenges = new PostgresAuthChallengeRepository();
      const rates = new PostgresAuthRateLimitRepository();
      const delivery = { name: 'qa-bootstrap', method: 'PHONE' as const, sendOtp: async () => undefined };
      const authV2 = new AuthV2Service({
        userIdentifierRepo: identifiers,
        challengeRepo: challenges,
        rateLimitRepo: rates,
        userRepo: userDb,
        sessionRepo: sessionDb as any,
        smsAdapter: delivery,
        emailAdapter: delivery,
        config: { nodeEnv: 'test', authEnv: 'test', deliveryMode: 'DEVELOPMENT_FIXED_OTP', developmentOtp: QA_FIXED_OTP, hmacSecret: QA_HMAC_SECRET },
      });
      const phone = `010${String(Math.floor(Math.random() * 90000000) + 10000000)}`;
      const issued = await authV2.requestChallenge({ surface: 'CUSTOMER', intent: 'CREATE_ACCOUNT', method: 'PHONE', identifier: phone, ipAddress: '127.0.0.1' });
      const verified = await authV2.verifyChallenge({ challengeId: issued.challengeId, otp: QA_FIXED_OTP, deviceInfo: 'qa-bootstrap', ipAddress: '127.0.0.1' });
      assert.ok(verified.continuationToken, 'new identifier must produce a continuation token');
      const complete = () => authV2.completeAccountCreation({ continuationToken: verified.continuationToken!, fullName: 'Synthetic QA Customer', deviceInfo: 'qa-bootstrap', ipAddress: '127.0.0.1' });
      const completions = await Promise.allSettled([complete(), complete()]);
      const successful = completions.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof complete>>> => result.status === 'fulfilled');
      assert.strictEqual(successful.length, 1, 'continuation replay must create one user/session only');
      assert.ok(completions.some((result) => result.status === 'rejected' && String((result as PromiseRejectedResult).reason?.message).includes('CONTINUATION_ALREADY_CONSUMED')));

      const tokens = successful[0].value.tokens;
      const stored = await sessionDb.getByRefreshTokenHash(hashRefreshToken(tokens.refreshToken));
      assert.ok(stored && stored.userId === successful[0].value.user.id && stored.surface === 'CUSTOMER' && stored.role === 'ROLE_CUSTOMER');
      const canonicalAuth = new AuthService(undefined, sessionDb, userDb);
      const refreshed = await canonicalAuth.refreshSession(tokens.refreshToken);
      assert.ok(refreshed.accessToken, 'canonical refresh must use the persisted session');
      await canonicalAuth.revokeSession(tokens.refreshToken);
      await expectRejected(() => canonicalAuth.refreshSession(tokens.refreshToken), 'revoked session must not refresh');
    });

    await record('Migration runner safety: QA baseline cannot be discovered by production migration directory scan', async () => {
      const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
      const baselinePath = path.resolve(__dirname, '../../../database/qa_baseline.sql');
      const discovered = fs.readdirSync(migrationsDir).filter((name) => /^\d+_.+\.sql$/u.test(name));
      assert.ok(discovered.includes('031_auth_v2_identity_and_challenges.sql'));
      assert.ok(!discovered.includes('qa_baseline.sql'));
      assert.notStrictEqual(path.dirname(baselinePath), migrationsDir);
    });
  } finally {
    await pool.end();
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    };
    restore('DATABASE_URL', originalEnv.databaseUrl);
    restore('SUPABASE_URL', originalEnv.supabaseUrl);
    restore('SUPABASE_SECRET_KEY', originalEnv.supabaseSecret);
    restore('SUPABASE_SERVICE_ROLE_KEY', originalEnv.supabaseService);
    restore('NODE_ENV', originalEnv.nodeEnv);
    restore('JWT_ACCESS_SECRET', originalEnv.accessSecret);
    restore('JWT_REFRESH_SECRET', originalEnv.refreshSecret);
  }

  return { total: results.length, passed: results.filter((result) => result.passed).length, failed: results.filter((result) => !result.passed).length, results };
}

if (process.argv[1]?.endsWith('authV2QaBootstrap.test.ts')) {
  runAuthV2QaBootstrapSuite().then(({ total, passed, failed, results }) => {
    for (const result of results) console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);
    console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
    process.exit(failed === 0 ? 0 : 1);
  }).catch((error) => {
    console.error('Auth V2 QA bootstrap suite error:', error);
    process.exit(1);
  });
}
