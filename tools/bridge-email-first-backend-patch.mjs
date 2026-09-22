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

patchFile('customer-app/src/utils/customerAuthV2Remediation.test.ts', [{
  label: 'verified missing email now carries reusable continuation',
  oldValue: `  // A verified LOGIN email that does not map to a QA account is not a malformed OTP
  // response. Email account creation remains deferred; Screen 09 should receive the
  // normal LOGIN_ACCOUNT_MISSING outcome and offer the existing phone-create path.
  const emailChallenge: AuthChallengeIssued = {
    challengeId: 'email-login-missing',
    intent: 'LOGIN',
    method: 'EMAIL',
    identifier: 'missing@example.com',
    maskedRecipient: 'm*****g@example.com',
    resendAvailableAt: new Date(Date.now() - 1_000).toISOString(),
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    authOrigin: { type: 'WELCOME_LOGIN' },
  };
  const missingEmailFetch = (async () => new Response(JSON.stringify({
    success: true,
    data: {
      success: true,
      challengeId: emailChallenge.challengeId,
      method: 'EMAIL',
      intent: 'LOGIN',
      isExistingUser: false,
      accountCreation: 'DEFERRED_EMAIL_ONLY',
    },
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch;
  const missingEmailResult = await verifyCustomerAuthChallenge(
    emailChallenge,
    '654321',
    { baseUrl: 'https://qa.example/api/v2', fetchImpl: missingEmailFetch },
  );
  assert(missingEmailResult.kind === 'LOGIN_ACCOUNT_MISSING', 'missing verified email returns LOGIN_ACCOUNT_MISSING rather than INVALID_RESPONSE');
  assert(missingEmailResult.method === 'EMAIL', 'missing verified email outcome preserves EMAIL method');`,
  newValue: `  // A verified LOGIN email that does not map to an account is a normal missing-account
  // outcome. The already-proven identifier carries a purpose-bound continuation so
  // an explicit Create Account action can proceed to Screen 10 without another OTP.
  const emailChallenge: AuthChallengeIssued = {
    challengeId: 'email-login-missing',
    intent: 'LOGIN',
    method: 'EMAIL',
    identifier: 'missing@example.com',
    maskedRecipient: 'm*****g@example.com',
    resendAvailableAt: new Date(Date.now() - 1_000).toISOString(),
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
    authOrigin: { type: 'WELCOME_LOGIN' },
  };
  const missingEmailFetch = (async () => new Response(JSON.stringify({
    success: true,
    data: {
      success: true,
      challengeId: emailChallenge.challengeId,
      method: 'EMAIL',
      intent: 'LOGIN',
      isExistingUser: false,
      requiresSignup: true,
      continuationToken: 'verified-email-login-continuation',
    },
  }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch;
  const missingEmailResult = await verifyCustomerAuthChallenge(
    emailChallenge,
    '654321',
    { baseUrl: 'https://qa.example/api/v2', fetchImpl: missingEmailFetch },
  );
  assert(missingEmailResult.kind === 'LOGIN_ACCOUNT_MISSING', 'missing verified email returns LOGIN_ACCOUNT_MISSING rather than INVALID_RESPONSE');
  assert(missingEmailResult.method === 'EMAIL', 'missing verified email outcome preserves EMAIL method');
  assert(missingEmailResult.continuationToken === 'verified-email-login-continuation', 'missing verified email retains the verified continuation for explicit creation');`,
}]);

patchFile('customer-app/src/utils/customerFavorites.ts', [{
  label: 'canonical Customer profile permits exactly email-only identity',
  oldValue: `  if (typeof canonicalData.phoneNumber !== 'string' || canonicalData.phoneNumber.trim() === '') {
    throw new Error('INVALID_CANONICAL_PROFILE: missing phoneNumber');
  }
  if (typeof canonicalData.status !== 'string' || canonicalData.status.trim() === '') {`,
  newValue: `  const canonicalPhone = typeof canonicalData.phoneNumber === 'string' && canonicalData.phoneNumber.trim() !== ''
    ? canonicalData.phoneNumber.trim()
    : canonicalData.phoneNumber === null ? null : undefined;
  const canonicalEmail = typeof canonicalData.email === 'string' && canonicalData.email.trim() !== ''
    ? canonicalData.email.trim()
    : canonicalData.email === null ? null : undefined;
  if (canonicalPhone === undefined) {
    throw new Error('INVALID_CANONICAL_PROFILE: malformed phoneNumber');
  }
  if (canonicalEmail === undefined) {
    throw new Error('INVALID_CANONICAL_PROFILE: malformed email');
  }
  if (canonicalPhone === null && canonicalEmail === null) {
    throw new Error('INVALID_CANONICAL_PROFILE: missing verified identifier');
  }
  if (typeof canonicalData.status !== 'string' || canonicalData.status.trim() === '') {`,
}, {
  label: 'canonical Customer profile returns nullable phone',
  oldValue: `    id: canonicalData.id.trim(),
    phoneNumber: canonicalData.phoneNumber.trim(),
    fullName: typeof canonicalData.fullName === 'string' && canonicalData.fullName.trim() !== '' ? canonicalData.fullName.trim() : null,
    email: typeof canonicalData.email === 'string' && canonicalData.email.trim() !== '' ? canonicalData.email.trim() : null,`,
  newValue: `    id: canonicalData.id.trim(),
    phoneNumber: canonicalPhone,
    fullName: typeof canonicalData.fullName === 'string' && canonicalData.fullName.trim() !== '' ? canonicalData.fullName.trim() : null,
    email: canonicalEmail,`,
}]);

patchFile('customer-app/src/utils/customerTruthfulState.test.ts', [{
  label: 'email-only canonical profile remains truthful',
  oldValue: `  assert(merged.fullName === null, 'canonical null fullName must remain null, never resurrected');
  assert(merged.email === null, 'canonical null email must remain null, never resurrected');
  assert(merged.phoneVerifiedAt === null, 'canonical null phoneVerifiedAt must remain null');

  // F8: mergeCustomerProfile fails closed if required canonical fields (like status) are missing`,
  newValue: `  assert(merged.fullName === null, 'canonical null fullName must remain null, never resurrected');
  assert(merged.email === null, 'canonical null email must remain null, never resurrected');
  assert(merged.phoneVerifiedAt === null, 'canonical null phoneVerifiedAt must remain null');

  const emailOnlyProfile = mergeCustomerProfile({
    ...canonicalNullNameProfile,
    phoneNumber: null,
    email: 'email.only@example.com',
    fullName: 'عميل بريد',
  });
  assert(emailOnlyProfile.phoneNumber === null, 'email-only Customer keeps canonical null phone without a placeholder');
  assert(emailOnlyProfile.email === 'email.only@example.com', 'email-only Customer keeps the verified canonical email');

  let noIdentifierThrew = false;
  try {
    mergeCustomerProfile({ ...canonicalNullNameProfile, phoneNumber: null, email: null });
  } catch {
    noIdentifierThrew = true;
  }
  assert(noIdentifierThrew, 'canonical Customer profile fails closed when both login identifiers are absent');

  // F8: mergeCustomerProfile fails closed if required canonical fields (like status) are missing`,
}]);

console.log('Applied bounded email-only canonical-session patches');
