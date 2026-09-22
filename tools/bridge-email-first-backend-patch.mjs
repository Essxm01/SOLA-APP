import fs from 'node:fs';

function patchFile(path, transforms) {
  let source = fs.readFileSync(path, 'utf8');
  for (const transform of transforms) {
    const { oldValue, newValue, label, expectedCount = 1 } = transform;
    let count = 0;
    let index = source.indexOf(oldValue);
    while (index >= 0) {
      count += 1;
      index = source.indexOf(oldValue, index + oldValue.length);
    }
    if (count !== expectedCount) throw new Error(`${path} ${label}: expected ${expectedCount} anchor(s), found ${count}`);
    if (expectedCount === 1) {
      const first = source.indexOf(oldValue);
      source = source.slice(0, first) + newValue + source.slice(first + oldValue.length);
    } else {
      source = source.split(oldValue).join(newValue);
    }
  }
  fs.writeFileSync(path, source);
}

patchFile('customer-app/src/utils/customerAuthV2.ts', [
  {
    label: 'multi-identifier verify result types',
    oldValue: `export type AuthV2VerifyResult =
  | { kind: 'AUTHENTICATED_EXISTING_ACCOUNT'; challengeId: string; method: AuthMethod; intent: AuthIntent; authOrigin: AuthOrigin; tokens: AuthV2SessionTokens; user?: unknown }
  | { kind: 'LOGIN_ACCOUNT_MISSING'; challengeId: string; method: 'PHONE'; intent: 'LOGIN'; authOrigin: AuthOrigin; continuationToken: string }
  | { kind: 'LOGIN_ACCOUNT_MISSING'; challengeId: string; method: 'EMAIL'; intent: 'LOGIN'; authOrigin: AuthOrigin }
  | { kind: 'CREATE_ACCOUNT_NEW_PHONE'; challengeId: string; method: 'PHONE'; intent: 'CREATE_ACCOUNT'; authOrigin: AuthOrigin; continuationToken: string; requiresFullName: true }
  | { kind: 'EMAIL_ACCOUNT_CREATION_DEFERRED'; challengeId: string; method: 'EMAIL'; intent: AuthIntent; authOrigin: AuthOrigin };`,
    newValue: `export type AuthV2VerifyResult =
  | { kind: 'AUTHENTICATED_EXISTING_ACCOUNT'; challengeId: string; method: AuthMethod; intent: AuthIntent; authOrigin: AuthOrigin; tokens: AuthV2SessionTokens; user?: unknown }
  | { kind: 'LOGIN_ACCOUNT_MISSING'; challengeId: string; method: AuthMethod; intent: 'LOGIN'; authOrigin: AuthOrigin; continuationToken: string }
  | { kind: 'CREATE_ACCOUNT_NEW_IDENTIFIER'; challengeId: string; method: AuthMethod; intent: 'CREATE_ACCOUNT'; authOrigin: AuthOrigin; continuationToken: string; requiresFullName: true };`,
  },
  {
    label: 'email mask helper',
    oldValue: `export function formatMaskedCustomerPhone(identifier: string): string {
  const digits = normalizeArabicDigits(identifier).replace(/\\D/g, '');
  const local = digits.startsWith('20') ? \`0\${digits.slice(2)}\` : digits;
  if (!/^01\\d{9}$/.test(local)) return '••••••';
  return \`\${local.slice(0, 3)}••••••\${local.slice(-2)}\`;
}
`,
    newValue: `export function formatMaskedCustomerPhone(identifier: string): string {
  const digits = normalizeArabicDigits(identifier).replace(/\\D/g, '');
  const local = digits.startsWith('20') ? \`0\${digits.slice(2)}\` : digits;
  if (!/^01\\d{9}$/.test(local)) return '••••••';
  return \`\${local.slice(0, 3)}••••••\${local.slice(-2)}\`;
}

/** Render a verified EMAIL identifier without exposing the full address. */
export function formatMaskedCustomerEmail(identifier: string): string {
  const normalized = normalizeCustomerEmail(identifier);
  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) return '••••••';
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const visibleLocal = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  return \`\${visibleLocal}•••@\${domain}\`;
}
`,
  },
  {
    label: 'generic verified identifier outcome parsing',
    oldValue: `  if (method === 'EMAIL') {
    if (data.accountCreation !== 'DEFERRED_EMAIL_ONLY') throw new CustomerAuthV2Error('INVALID_RESPONSE');
    if (intent === 'LOGIN') {
      return { kind: 'LOGIN_ACCOUNT_MISSING', challengeId: challenge.challengeId, method, intent, authOrigin: challenge.authOrigin };
    }
    return { kind: 'EMAIL_ACCOUNT_CREATION_DEFERRED', challengeId: challenge.challengeId, method, intent, authOrigin: challenge.authOrigin };
  }
  if (typeof data.continuationToken !== 'string' || data.continuationToken.length === 0) throw new CustomerAuthV2Error('INVALID_RESPONSE');
  if (intent === 'LOGIN') return { kind: 'LOGIN_ACCOUNT_MISSING', challengeId: challenge.challengeId, method, intent, authOrigin: challenge.authOrigin, continuationToken: data.continuationToken };
  if (data.requiresFullName !== true) throw new CustomerAuthV2Error('INVALID_RESPONSE');
  return { kind: 'CREATE_ACCOUNT_NEW_PHONE', challengeId: challenge.challengeId, method, intent, authOrigin: challenge.authOrigin, continuationToken: data.continuationToken, requiresFullName: true };`,
    newValue: `  if (typeof data.continuationToken !== 'string' || data.continuationToken.length === 0) throw new CustomerAuthV2Error('INVALID_RESPONSE');
  if (intent === 'LOGIN') return { kind: 'LOGIN_ACCOUNT_MISSING', challengeId: challenge.challengeId, method, intent, authOrigin: challenge.authOrigin, continuationToken: data.continuationToken };
  if (data.requiresFullName !== true) throw new CustomerAuthV2Error('INVALID_RESPONSE');
  return { kind: 'CREATE_ACCOUNT_NEW_IDENTIFIER', challengeId: challenge.challengeId, method, intent, authOrigin: challenge.authOrigin, continuationToken: data.continuationToken, requiresFullName: true };`,
  },
]);

patchFile('customer-app/src/utils/customerAuthV2Flow.ts', [
  {
    label: 'AuthMethod import',
    oldValue: `import type { AuthChallengeIssued, AuthOrigin, AuthV2VerifyResult } from './customerAuthV2';`,
    newValue: `import type { AuthChallengeIssued, AuthMethod, AuthOrigin, AuthV2VerifyResult } from './customerAuthV2';`,
  },
  {
    label: 'Screen10 handoff method',
    oldValue: `  method: 'PHONE';`,
    newValue: `  method: AuthMethod;`,
  },
  {
    label: 'new identifier handoff kind',
    oldValue: `export function createScreen10Handoff(result: Extract<AuthV2VerifyResult, { kind: 'CREATE_ACCOUNT_NEW_PHONE' }>, challenge: AuthChallengeIssued): Screen10Handoff {`,
    newValue: `export function createScreen10Handoff(result: Extract<AuthV2VerifyResult, { kind: 'CREATE_ACCOUNT_NEW_IDENTIFIER' }>, challenge: AuthChallengeIssued): Screen10Handoff {`,
  },
  {
    label: 'missing login handoff supports either identifier',
    oldValue: `): Screen10Handoff | null {
  if (result.method !== 'PHONE') return null;
  return {
    continuationToken: result.continuationToken,
    method: 'PHONE',`,
    newValue: `): Screen10Handoff {
  return {
    continuationToken: result.continuationToken,
    method: result.method,`,
  },
]);

patchFile('customer-app/src/components/CustomerAuthScreen09.tsx', [
  {
    label: 'remove phone-only continuation prop',
    oldValue: `  onCreateAccountFromMissing?: (result: Extract<AuthV2VerifyResult, { kind: 'LOGIN_ACCOUNT_MISSING' }>) => void;\n  onContinueWithPhoneCreateAccount?: () => void;`,
    newValue: `  onCreateAccountFromMissing?: (result: Extract<AuthV2VerifyResult, { kind: 'LOGIN_ACCOUNT_MISSING' }>) => void;`,
  },
  {
    label: 'remove phone-only continuation destructure',
    oldValue: `  onVerified,\n  onCreateAccountFromMissing,\n  onContinueWithPhoneCreateAccount,`,
    newValue: `  onVerified,\n  onCreateAccountFromMissing,`,
  },
  {
    label: 'outcome flags become identifier-agnostic',
    oldValue: `  const missingLogin = outcome?.kind === 'LOGIN_ACCOUNT_MISSING' ? outcome : null;\n  const isEmailDeferred = outcome?.kind === 'EMAIL_ACCOUNT_CREATION_DEFERRED';\n  const screen10Pending = outcome?.kind === 'CREATE_ACCOUNT_NEW_PHONE';`,
    newValue: `  const missingLogin = outcome?.kind === 'LOGIN_ACCOUNT_MISSING' ? outcome : null;\n  const screen10Pending = outcome?.kind === 'CREATE_ACCOUNT_NEW_IDENTIFIER' ? outcome : null;`,
  },
  {
    label: 'verified terminal content is method-agnostic',
    oldValue: `              {missingLogin && <><p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{missingLogin.method === 'PHONE' ? 'لا يوجد حساب مرتبط بهذا الرقم.' : 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني.'}</p>{missingLogin.method === 'PHONE' ? <button type="button" onClick={() => { onCreateAccountFromMissing?.(missingLogin); returnToScreen08(); }} className="mt-8 min-h-[54px] w-full rounded-xl bg-[var(--sola-primary-blue)] px-4 text-base font-extrabold text-white">إنشاء حساب</button> : <button type="button" onClick={onContinueWithPhoneCreateAccount} className="mt-8 min-h-[54px] w-full rounded-xl bg-[var(--sola-primary-blue)] px-4 text-base font-extrabold text-white">استخدام رقم الهاتف</button>}<button type="button" onClick={returnToScreen08} className="mt-3 min-h-11 w-full rounded-xl px-3 text-sm font-extrabold text-slate-600">استخدام رقم آخر</button></>}\n              {screen10Pending && <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">تم التحقق من ملكية الرقم. أكمل بيانات الحساب في الخطوة التالية.</p>}\n              {isEmailDeferred && <><p className="mt-3 text-sm font-semibold leading-7 text-slate-600">إنشاء الحساب بالبريد الإلكتروني غير متاح حاليًا.</p><button type="button" onClick={onContinueWithPhoneCreateAccount} className="mt-8 min-h-[54px] w-full rounded-xl bg-[var(--sola-primary-blue)] px-4 text-base font-extrabold text-white">استخدام رقم الهاتف</button></>}`,
    newValue: `              {missingLogin && <><p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{missingLogin.method === 'PHONE' ? 'لا يوجد حساب مرتبط بهذا الرقم.' : 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني.'}</p><button type="button" onClick={() => { onCreateAccountFromMissing?.(missingLogin); returnToScreen08(); }} className="mt-8 min-h-[54px] w-full rounded-xl bg-[var(--sola-primary-blue)] px-4 text-base font-extrabold text-white">إنشاء حساب</button><button type="button" onClick={returnToScreen08} className="mt-3 min-h-11 w-full rounded-xl px-3 text-sm font-extrabold text-slate-600">استخدام وسيلة أخرى</button></>}\n              {screen10Pending && <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{screen10Pending.method === 'PHONE' ? 'تم التحقق من ملكية الرقم. أكمل بيانات الحساب في الخطوة التالية.' : 'تم التحقق من ملكية البريد الإلكتروني. أكمل بيانات الحساب في الخطوة التالية.'}</p>}`,
  },
]);

patchFile('customer-app/src/components/CustomerAuthScreen10.tsx', [
  {
    label: 'import masked email helper',
    oldValue: `  CustomerAuthV2Error,\n  formatMaskedCustomerPhone,`,
    newValue: `  CustomerAuthV2Error,\n  formatMaskedCustomerEmail,\n  formatMaskedCustomerPhone,`,
  },
  {
    label: 'reverify message is method aware',
    oldValue: `function screen10ErrorMessage(error: unknown): string {`,
    newValue: `function screen10ErrorMessage(error: unknown, method: 'PHONE' | 'EMAIL'): string {`,
  },
  {
    label: 'reverify copy',
    oldValue: `    return 'انتهت خطوة التحقق. تحقق من رقم الهاتف مرة أخرى لإكمال إنشاء الحساب.';`,
    newValue: `    return method === 'PHONE'\n      ? 'انتهت خطوة التحقق. تحقق من رقم الهاتف مرة أخرى لإكمال إنشاء الحساب.'\n      : 'انتهت خطوة التحقق. تحقق من البريد الإلكتروني مرة أخرى لإكمال إنشاء الحساب.';`,
  },
  {
    label: 'error call receives method',
    oldValue: `          : screen10ErrorMessage(caught),`,
    newValue: `          : screen10ErrorMessage(caught, handoff.method),`,
  },
  {
    label: 'verified identifier context',
    oldValue: `              <span>تم التحقق من رقم الهاتف</span>\n              <span aria-hidden="true">·</span>\n              <span dir="ltr" className="font-extrabold text-slate-700">\n                {formatMaskedCustomerPhone(handoff.identifier)}\n              </span>`,
    newValue: `              <span>{handoff.method === 'PHONE' ? 'تم التحقق من رقم الهاتف' : 'تم التحقق من البريد الإلكتروني'}</span>\n              <span aria-hidden="true">·</span>\n              <span dir="ltr" className="font-extrabold text-slate-700">\n                {handoff.method === 'PHONE' ? formatMaskedCustomerPhone(handoff.identifier) : formatMaskedCustomerEmail(handoff.identifier)}\n              </span>`,
  },
  {
    label: 'reverify CTA method-aware',
    oldValue: `                إعادة التحقق من رقم الهاتف`,
    newValue: `                {handoff.method === 'PHONE' ? 'إعادة التحقق من رقم الهاتف' : 'إعادة التحقق من البريد الإلكتروني'}`,
  },
]);

patchFile('customer-app/src/App.tsx', [
  {
    label: 'new identifier verify outcome',
    oldValue: `    if (result.kind === 'CREATE_ACCOUNT_NEW_PHONE') {`,
    newValue: `    if (result.kind === 'CREATE_ACCOUNT_NEW_IDENTIFIER') {`,
  },
  {
    label: 'Screen10 completion uses verified method',
    oldValue: `    await finalizeAuthV2Session(result.tokens, 'PHONE', screen10Handoff.authOrigin, signal);`,
    newValue: `    await finalizeAuthV2Session(result.tokens, screen10Handoff.method, screen10Handoff.authOrigin, signal);`,
  },
  {
    label: 'reverification preserves identifier method',
    oldValue: `    const preservedPhone = restoreScreen08PhoneValue(screen10Handoff.identifier);\n    setAuthV2Screen08Draft((current) => ({\n      intent: 'CREATE_ACCOUNT',\n      method: 'PHONE',\n      phone: current?.phone || preservedPhone,\n      email: current?.email ?? '',\n    }));`,
    newValue: `    const preservedPhone = screen10Handoff.method === 'PHONE' ? restoreScreen08PhoneValue(screen10Handoff.identifier) : '';\n    const preservedEmail = screen10Handoff.method === 'EMAIL' ? screen10Handoff.identifier : '';\n    setAuthV2Screen08Draft((current) => ({\n      intent: 'CREATE_ACCOUNT',\n      method: screen10Handoff.method,\n      phone: screen10Handoff.method === 'PHONE' ? (current?.phone || preservedPhone) : (current?.phone ?? ''),\n      email: screen10Handoff.method === 'EMAIL' ? (current?.email || preservedEmail) : (current?.email ?? ''),\n    }));`,
  },
  {
    label: 'missing-login create draft preserves method',
    oldValue: `      setScreen10Handoff(handoff);\n      setAuthV2Screen08Draft((current) => ({ intent: 'CREATE_ACCOUNT', method: 'PHONE', phone: restoreScreen08PhoneValue(authV2Challenge.identifier), email: current?.email ?? '' }));`,
    newValue: `      setScreen10Handoff(handoff);\n      setAuthV2Screen08Draft((current) => ({\n        intent: 'CREATE_ACCOUNT',\n        method: result.method,\n        phone: result.method === 'PHONE' ? restoreScreen08PhoneValue(authV2Challenge.identifier) : (current?.phone ?? ''),\n        email: result.method === 'EMAIL' ? authV2Challenge.identifier : (current?.email ?? ''),\n      }));`,
  },
  {
    label: 'remove obsolete phone-only continuation function',
    oldValue: `\n  const continueWithPhoneCreateAccount = (): void => {\n    setAuthV2Screen08Draft((current) => ({\n      intent: 'CREATE_ACCOUNT',\n      method: 'PHONE',\n      phone: '',\n      email: current?.email ?? '',\n    }));\n    setAuthV2Challenge(null);\n  };\n`,
    newValue: `\n`,
  },
  {
    label: 'remove obsolete Screen09 prop wiring',
    oldValue: `\n            onContinueWithPhoneCreateAccount={continueWithPhoneCreateAccount}`,
    newValue: ``,
    expectedCount: 1,
  },
  {
    label: 'remove second obsolete Screen09 prop wiring',
    oldValue: `\n          onContinueWithPhoneCreateAccount={continueWithPhoneCreateAccount}`,
    newValue: ``,
    expectedCount: 1,
  },
]);

patchFile('customer-app/src/utils/customerScreen09AuthV2.test.ts', [
  {
    label: 'new phone outcome kind',
    oldValue: `  equal(create.kind, 'CREATE_ACCOUNT_NEW_PHONE', 'new phone outcome requires the future full-name step');`,
    newValue: `  equal(create.kind, 'CREATE_ACCOUNT_NEW_IDENTIFIER', 'new phone outcome requires the full-name step');`,
  },
  {
    label: 'email creation proceeds to Screen10',
    oldValue: `  const deferred = await verifyCustomerAuthChallenge(\n    { ...challenge, intent: 'CREATE_ACCOUNT', method: 'EMAIL' },\n    '482731',\n    { baseUrl: 'https://qa.example/api/v2', fetchImpl: outcomeFetch({ challengeId: challenge.challengeId, method: 'EMAIL', intent: 'CREATE_ACCOUNT', isExistingUser: false, accountCreation: 'DEFERRED_EMAIL_ONLY' }) },\n  );\n  equal(deferred.kind, 'EMAIL_ACCOUNT_CREATION_DEFERRED', 'email creation remains explicitly deferred');`,
    newValue: `  const emailCreate = await verifyCustomerAuthChallenge(\n    { ...challenge, intent: 'CREATE_ACCOUNT', method: 'EMAIL', identifier: 'new@example.com' },\n    '482731',\n    { baseUrl: 'https://qa.example/api/v2', fetchImpl: outcomeFetch({ challengeId: challenge.challengeId, method: 'EMAIL', intent: 'CREATE_ACCOUNT', isExistingUser: false, requiresFullName: true, continuationToken: 'email-create-token' }) },\n  );\n  equal(emailCreate.kind, 'CREATE_ACCOUNT_NEW_IDENTIFIER', 'new verified email proceeds to the full-name step');\n  equal(emailCreate.method, 'EMAIL', 'email creation preserves the verified method');`,
  },
]);

patchFile('customer-app/src/utils/customerAuthV2Flow.test.ts', [
  {
    label: 'create result kind',
    oldValue: `  kind: 'CREATE_ACCOUNT_NEW_PHONE' as const,`,
    newValue: `  kind: 'CREATE_ACCOUNT_NEW_IDENTIFIER' as const,`,
  },
  {
    label: 'email missing login now creates handoff',
    oldValue: `equal(createScreen10HandoffFromMissingLogin({ ...missingResult, method: 'EMAIL' as const }, { ...challenge, method: 'EMAIL' as const, authOrigin: missingResult.authOrigin }), null, 'email missing-login cannot enter phone-only Screen 10');`,
    newValue: `const emailMissingHandoff = createScreen10HandoffFromMissingLogin({ ...missingResult, method: 'EMAIL' as const }, { ...challenge, method: 'EMAIL' as const, identifier: 'new@example.com', authOrigin: missingResult.authOrigin });\nequal(emailMissingHandoff.method, 'EMAIL', 'verified missing email can enter identifier-agnostic Screen 10');\nequal(emailMissingHandoff.identifier, 'new@example.com', 'email handoff preserves the verified identifier');`,
  },
]);

patchFile('customer-app/src/utils/customerAuthV2Screen10Contract.test.ts', [
  {
    label: 'method-aware recovery contract',
    oldValue: `  assert(screen10.includes('إعادة التحقق من رقم الهاتف'), 'Screen 10 has safe continuation recovery');`,
    newValue: `  assert(screen10.includes("handoff.method === 'PHONE' ? 'إعادة التحقق من رقم الهاتف' : 'إعادة التحقق من البريد الإلكتروني'"), 'Screen 10 has method-aware safe continuation recovery');\n  assert(screen10.includes('formatMaskedCustomerEmail(handoff.identifier)'), 'Screen 10 shows verified email context without requiring a phone');`,
  },
]);

console.log('Applied bounded Customer email-first multi-identifier patches');
