import fs from 'node:fs';

function patchFile(path, transforms) {
  let source = fs.readFileSync(path, 'utf8');
  for (const { oldValue, newValue, label } of transforms) {
    const first = source.indexOf(oldValue);
    if (first < 0) throw new Error(`${path} ${label}: anchor not found`);
    if (source.indexOf(oldValue, first + oldValue.length) >= 0) throw new Error(`${path} ${label}: anchor not unique`);
    source = source.slice(0, first) + newValue + source.slice(first + oldValue.length);
  }
  fs.writeFileSync(path, source);
}

patchFile('backend/server/src/app.ts', [{
  label: 'verified email response must expose continuation',
  oldValue: `            if (result.user) data.user = safeAuthUser(result.user);
            if (result.tokens) data.tokens = result.tokens;
            if (result.method === 'EMAIL' && !result.isExistingUser) {
              data.accountCreation = 'DEFERRED_EMAIL_ONLY';
            } else if (result.continuationToken) {
              data.continuationToken = result.continuationToken;
            }`,
  newValue: `            if (result.user) data.user = safeAuthUser(result.user);
            if (result.tokens) data.tokens = result.tokens;
            if (result.continuationToken) data.continuationToken = result.continuationToken;`,
}]);

patchFile('backend/server/src/tests/authV2Foundation.test.ts', [{
  label: 'replace deferred email domain test',
  oldValue: `  // BLOCKER 4 HARDENING
  await record('DOMAIN', 'EMAIL + new account: verifies identifier but blocks account creation without fake phone', async () => {
    const { service } = createIsolatedTestService();

    // 1. Request challenge for EMAIL + CREATE_ACCOUNT
    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'CREATE_ACCOUNT',
      method: 'EMAIL',
      identifier: 'new.guest@sola.com',
    });

    // 2. Verification succeeds normally
    const verified = await service.verifyChallenge({
      challengeId: issued.challengeId,
      otp: TEST_FIXED_OTP,
    });
    assert.strictEqual(verified.success, true);
    assert.strictEqual(verified.method, 'EMAIL');
    assert.ok(verified.continuationToken);

    // 3. Attempting to complete account creation for EMAIL must FAIL CLOSED
    // Proves ZERO fake phone numbers are created!
    await assert.rejects(
      async () => {
        await service.completeAccountCreation({
          continuationToken: verified.continuationToken!,
          fullName: 'عميل إيميل جديد',
        });
      },
      /EMAIL_ONLY_ACCOUNT_CREATION_NOT_ENABLED/
    );
  });`,
  newValue: `  await record('DOMAIN', 'EMAIL + new account creates canonical Customer without fake phone', async () => {
    const { service, userIdentifierRepo } = createIsolatedTestService();
    const issued = await service.requestChallenge({
      surface: 'CUSTOMER',
      intent: 'CREATE_ACCOUNT',
      method: 'EMAIL',
      identifier: 'new.guest@sola.com',
    });
    const verified = await service.verifyChallenge({
      challengeId: issued.challengeId,
      otp: TEST_FIXED_OTP,
    });
    assert.strictEqual(verified.success, true);
    assert.strictEqual(verified.method, 'EMAIL');
    assert.strictEqual(verified.requiresFullName, true);
    assert.ok(verified.continuationToken);

    const completed = await service.completeAccountCreation({
      continuationToken: verified.continuationToken!,
      fullName: 'عميل إيميل جديد',
    });
    assert.strictEqual(completed.success, true);
    assert.strictEqual(completed.user.phoneNumber ?? null, null);
    assert.strictEqual(completed.user.email, 'new.guest@sola.com');
    const identifier = await userIdentifierRepo.getByIdentifier('EMAIL', 'new.guest@sola.com');
    assert.ok(identifier);
    assert.strictEqual(identifier.userId, completed.user.id);
    assert.ok(completed.tokens.accessToken);
  });`,
}]);

patchFile('backend/server/src/tests/authV2RuntimeApi01.test.ts', [{
  label: 'replace deferred email runtime API test',
  oldValue: `    await record('Unknown email remains truthful and deferred without fake phone/user/session', async () => {
      const fixture = createFixture();
      const issued = await request(fixture.app, 'POST', '/api/v2/auth/challenges', { surface: 'CUSTOMER', intent: 'CREATE_ACCOUNT', method: 'EMAIL', identifier: 'new@example.com' });
      const verified = await request(fixture.app, 'POST', \`/api/v2/auth/challenges/\${issued.body.data.challengeId}/verify\`, { otp: '123456' });
      assert.strictEqual(verified.status, 200);
      assert.strictEqual(verified.body.data.accountCreation, 'DEFERRED_EMAIL_ONLY');
      assert.ok(!('continuationToken' in verified.body.data));
      const complete = await request(fixture.app, 'POST', '/api/v2/auth/registration/complete', { continuationToken: 'not-exposed', fullName: 'Should Not Exist' });
      assert.notStrictEqual(complete.status, 201);
    });`,
  newValue: `    await record('Unknown verified email creates an email-only Customer without fake phone', async () => {
      const fixture = createFixture();
      const issued = await request(fixture.app, 'POST', '/api/v2/auth/challenges', { surface: 'CUSTOMER', intent: 'CREATE_ACCOUNT', method: 'EMAIL', identifier: 'new@example.com' });
      const verified = await request(fixture.app, 'POST', \`/api/v2/auth/challenges/\${issued.body.data.challengeId}/verify\`, { otp: '123456' });
      assert.strictEqual(verified.status, 200);
      assert.strictEqual(verified.body.data.requiresFullName, true);
      assert.ok(typeof verified.body.data.continuationToken === 'string');
      const complete = await request(fixture.app, 'POST', '/api/v2/auth/registration/complete', { continuationToken: verified.body.data.continuationToken, fullName: 'Email Customer' });
      assert.strictEqual(complete.status, 201);
      assert.strictEqual(complete.body.data.user.fullName, 'Email Customer');
      assert.ok(!('phoneNumber' in complete.body.data.user));
      assert.ok(complete.body.data.tokens.accessToken);
      const replay = await request(fixture.app, 'POST', '/api/v2/auth/registration/complete', { continuationToken: verified.body.data.continuationToken, fullName: 'Email Customer' });
      assert.strictEqual(replay.status, 409);
    });`,
}]);

console.log('Applied bounded backend email-first contract patches');
