/**
 * Sola Vacation Rentals — AUTH-02B1: Shared Identity Resolution, Canonical Phone & Correct Role Issuance Test Suite
 * Location: server/src/tests/sharedIdentityResolution.test.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */

import { ExpressServerApp } from '../app.js';
import { AuthService, dbUsersStore, dbOwnersStore, type UserRecord, type OwnerRecord } from '../services/authService.js';
import { userDb, ownerDb } from '../services/dbRepository.js';
import { normalizePhoneNumber } from '../utils/phoneNormalizer.js';
import { verifyAccessToken } from '../services/jwtService.js';
import type { TestResult } from './authSecurity.test.js';

export async function runSharedIdentityResolutionSuite(): Promise<{ total: number; passed: number; failed: number; results: TestResult[] }> {
  const results: TestResult[] = [];
  const app = new ExpressServerApp();
  const authService = new AuthService();

  // Determine existing prototype owner
  const existingOwnerPhone = '+201000000001';
  let existingOwner = await userDb.getByPhone(existingOwnerPhone).catch(() => null);
  let existingOwnerId = existingOwner?.id;

  if (!existingOwnerId) {
    existingOwnerId = '11111111-2222-4333-8444-555555555555';
    const seededUser: UserRecord = {
      id: existingOwnerId,
      phoneNumber: existingOwnerPhone,
      phoneVerifiedAt: new Date().toISOString(),
      fullName: null,
      email: null,
      avatarUrl: null,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const seededOwner: OwnerRecord = {
      id: existingOwnerId,
      phoneNumber: existingOwnerPhone,
      fullName: 'مالك صولا الحقيقي',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbUsersStore.set(existingOwnerPhone, seededUser);
    dbOwnersStore.set(existingOwnerId, seededOwner);
  }

  // --------------------------------------------------------------------------
  // TEST 1: Phone Normalization Contract
  // --------------------------------------------------------------------------
  try {
    const n1 = normalizePhoneNumber('01012345678');
    const n2 = normalizePhoneNumber('201012345678');
    const n3 = normalizePhoneNumber('+201012345678');
    const n4 = normalizePhoneNumber('+20 101 234 5678');
    const allMatch = n1 === '+201012345678' && n2 === n1 && n3 === n1 && n4 === n1;
    results.push({
      name: 'AUTH-02B1 [1]: Egyptian phone variations (010, 2010, +2010, spaces) normalize to canonical +201012345678',
      passed: allMatch,
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [1]: Phone Normalization Contract', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 2: Malformed Phone Validation
  // --------------------------------------------------------------------------
  try {
    let rejectedCount = 0;
    const malformed = ['123', '01312345678', '+14155552671', 'abc', ''];
    for (const p of malformed) {
      try {
        normalizePhoneNumber(p);
      } catch {
        rejectedCount++;
      }
    }
    results.push({
      name: 'AUTH-02B1 [2]: Malformed or non-Egyptian mobile phones strictly rejected with validation error',
      passed: rejectedCount === malformed.length,
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [2]: Malformed Phone Validation', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 3: OTP Request Does NOT Create User
  // --------------------------------------------------------------------------
  try {
    const newPhone = '01122334455';
    const canonicalNewPhone = '+201122334455';
    const preCount = dbUsersStore.size;
    const reqRes = await authService.requestOtp(newPhone);
    const postCount = dbUsersStore.size;
    const noUserCreated = reqRes.success && preCount === postCount && !dbUsersStore.has(canonicalNewPhone);
    results.push({
      name: 'AUTH-02B1 [3]: OTP request generates challenge but does NOT create User record in store',
      passed: noUserCreated,
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [3]: OTP Request No User Mutation', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 4: New CUSTOMER Verification — Random UUID, User Only, ROLE_CUSTOMER, Null Profile
  // --------------------------------------------------------------------------
  let newCustomerId = '';
  try {
    const rawNewCustomerPhone = '01299887766';
    await authService.requestOtp(rawNewCustomerPhone);

    const verifyRes = await authService.verifyOtp(rawNewCustomerPhone, '1234', 'CUSTOMER');
    newCustomerId = verifyRes.user.id;

    const jwt = verifyAccessToken(verifyRes.tokens.accessToken);
    const isRandomUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newCustomerId);
    const isNotPhoneDerived = !newCustomerId.endsWith('01299887766');
    const isRoleCustomer = jwt.role === 'ROLE_CUSTOMER';
    const isOwnerNull = verifyRes.owner === null && !dbOwnersStore.has(newCustomerId);
    const isProfileNull = verifyRes.user.fullName === null && verifyRes.user.email === null && verifyRes.user.avatarUrl === null;

    results.push({
      name: 'AUTH-02B1 [4]: New Customer login creates User only, random UUID, ROLE_CUSTOMER, zero fake profile strings',
      passed: isRandomUuid && isNotPhoneDerived && isRoleCustomer && isOwnerNull && isProfileNull,
      error: !isRoleCustomer ? `Expected ROLE_CUSTOMER, got ${jwt.role}` : undefined,
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [4]: New Customer Verification', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 5: Repeated CUSTOMER Login Preserves Existing UUID (Zero Duplication)
  // --------------------------------------------------------------------------
  try {
    const rawCustomerPhoneAgain = '+20 129 988 7766';
    await authService.requestOtp(rawCustomerPhoneAgain);
    const verifyResAgain = await authService.verifyOtp(rawCustomerPhoneAgain, '1234', 'CUSTOMER');

    const sameId = verifyResAgain.user.id === newCustomerId;
    results.push({
      name: 'AUTH-02B1 [5]: Repeated Customer login with alternate formatting preserves exact same users.id',
      passed: sameId,
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [5]: Repeated Customer Login Identity Preservation', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 6: Existing Owner Logging into Customer App receives ROLE_CUSTOMER with SAME UUID
  // --------------------------------------------------------------------------
  try {
    await authService.requestOtp(existingOwnerPhone);
    const custAuthRes = await authService.verifyOtp(existingOwnerPhone, '1234', 'CUSTOMER');
    const jwtCust = verifyAccessToken(custAuthRes.tokens.accessToken);

    const sameUuid = custAuthRes.user.id === existingOwnerId;
    const roleCustomer = jwtCust.role === 'ROLE_CUSTOMER';
    const isOwnerFlag = custAuthRes.isOwner === true;

    results.push({
      name: 'AUTH-02B1 [6]: Existing Owner authenticating on Customer App receives ROLE_CUSTOMER with same human UUID',
      passed: sameUuid && roleCustomer && isOwnerFlag,
      error: !sameUuid ? `UUID mismatch: expected ${existingOwnerId}, got ${custAuthRes.user.id}` : (!roleCustomer ? `Expected ROLE_CUSTOMER, got ${jwtCust.role}` : undefined),
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [6]: Owner on Customer App Role Issuance', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 7: Existing Owner Logging into Owner App receives ROLE_OWNER with SAME UUID
  // --------------------------------------------------------------------------
  try {
    await authService.requestOtp(existingOwnerPhone);
    const ownerAuthRes = await authService.verifyOtp(existingOwnerPhone, '1234', 'OWNER');
    const jwtOwner = verifyAccessToken(ownerAuthRes.tokens.accessToken);

    const sameUuid = ownerAuthRes.user.id === existingOwnerId;
    const roleOwner = jwtOwner.role === 'ROLE_OWNER';
    const noOnboardingRequired = ownerAuthRes.ownerOnboardingRequired === false;

    results.push({
      name: 'AUTH-02B1 [7]: Existing Owner authenticating on Owner App receives ROLE_OWNER with same human UUID',
      passed: sameUuid && roleOwner && noOnboardingRequired,
      error: !sameUuid ? `UUID mismatch: expected ${existingOwnerId}, got ${ownerAuthRes.user.id}` : (!roleOwner ? `Expected ROLE_OWNER, got ${jwtOwner.role}` : undefined),
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [7]: Owner on Owner App Role Issuance', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 8: Pure User Logging into Owner App is NOT Promoted (ownerOnboardingRequired: true)
  // --------------------------------------------------------------------------
  let pureUserToken = '';
  try {
    const rawPureUserPhone = '01511223344';
    await authService.requestOtp(rawPureUserPhone);
    const pureAuthRes = await authService.verifyOtp(rawPureUserPhone, '1234', 'OWNER');
    pureUserToken = pureAuthRes.tokens.accessToken;
    const jwtPure = verifyAccessToken(pureUserToken);

    const onboardingRequired = pureAuthRes.ownerOnboardingRequired === true;
    const isOwnerNull = pureAuthRes.owner === null;
    const noOwnersRow = !dbOwnersStore.has(pureAuthRes.user.id);
    const roleIsCustomer = jwtPure.role === 'ROLE_CUSTOMER';

    results.push({
      name: 'AUTH-02B1 [8]: Pure User logging into Owner App is not auto-promoted (ownerOnboardingRequired=true, no owners row)',
      passed: onboardingRequired && isOwnerNull && noOwnersRow && roleIsCustomer,
      error: !onboardingRequired ? 'Expected ownerOnboardingRequired=true' : undefined,
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [8]: Pure User on Owner App Boundary', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 9: HTTP API: Customer Token Accepted on Protected Customer Route
  // --------------------------------------------------------------------------
  try {
    const custPhone = '+201099991001';
    await authService.requestOtp(custPhone);
    const custToken = (await authService.verifyOtp(custPhone, '1234', 'CUSTOMER')).tokens.accessToken;
    const resCust = await app.handleHttpRequest('GET', '/api/v1/customer/bookings', { authorization: `Bearer ${custToken}` });
    const isAllowed = resCust.statusCode === 200;
    results.push({
      name: 'AUTH-02B1 [9]: Customer JWT token accepted on protected Customer API route (200 OK)',
      passed: isAllowed,
      error: isAllowed ? undefined : `Expected 200 OK, got ${resCust.statusCode}`,
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [9]: Customer API Access', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 10: HTTP API: Customer Token Strictly REJECTED on Owner Protected Route (403 Forbidden)
  // --------------------------------------------------------------------------
  try {
    const custPhone = '+201099991002';
    await authService.requestOtp(custPhone);
    const custToken = (await authService.verifyOtp(custPhone, '1234', 'CUSTOMER')).tokens.accessToken;
    const resOwnerRoute = await app.handleHttpRequest('GET', '/api/v1/owner/properties', { authorization: `Bearer ${custToken}` });
    const isBlocked = resOwnerRoute.statusCode === 403;
    results.push({
      name: 'AUTH-02B1 [10]: Customer JWT token strictly rejected on protected Owner API route with 403 Forbidden',
      passed: isBlocked,
      error: isBlocked ? undefined : `Expected 403 Forbidden, got ${resOwnerRoute.statusCode}`,
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [10]: Owner API Security Barrier', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 11: HTTP API: Owner Token Accepted on Owner Protected Route
  // --------------------------------------------------------------------------
  try {
    const ownerPhone = '+201099991003';
    // Seed owner in DB
    const ownerId = crypto.randomUUID();
    dbUsersStore.set(ownerPhone, { id: ownerId, phoneNumber: ownerPhone, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    dbOwnersStore.set(ownerId, { id: ownerId, phoneNumber: ownerPhone, fullName: 'مالك تجريبي', status: 'ACTIVE', verificationStatus: 'VERIFIED', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    await authService.requestOtp(ownerPhone);
    const ownerToken = (await authService.verifyOtp(ownerPhone, '1234', 'OWNER')).tokens.accessToken;
    const resOwnerRoute = await app.handleHttpRequest('GET', '/api/v1/owner/properties', { authorization: `Bearer ${ownerToken}` });
    const isAllowed = resOwnerRoute.statusCode === 200;
    results.push({
      name: 'AUTH-02B1 [11]: Owner JWT token accepted on protected Owner API route (200 OK)',
      passed: isAllowed,
      error: isAllowed ? undefined : `Expected 200 OK, got ${resOwnerRoute.statusCode}`,
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [11]: Owner API Access', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 12: Admin Authentication Remains Fully Isolated
  // --------------------------------------------------------------------------
  try {
    const adminLoginRes = await authService.adminLogin('admin@sola.com', 'AdminPassword2026!');
    const adminJwt = verifyAccessToken(adminLoginRes.tokens.accessToken);
    const isAdminRole = adminJwt.role === 'ROLE_ADMIN';
    const adminBlockedOnOwner = (await app.handleHttpRequest('GET', '/api/v1/owner/properties', { authorization: `Bearer ${adminLoginRes.tokens.accessToken}` })).statusCode === 403;
    results.push({
      name: 'AUTH-02B1 [12]: Admin authentication isolated in admin_users, signs ROLE_ADMIN, blocked on Owner routes',
      passed: isAdminRole && adminBlockedOnOwner,
      error: !isAdminRole ? `Expected ROLE_ADMIN, got ${adminJwt.role}` : (!adminBlockedOnOwner ? 'Admin not blocked on owner route' : undefined),
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [12]: Admin Authentication Isolation', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 13: HTTP Verify-OTP Endpoint Surface Routing
  // --------------------------------------------------------------------------
  try {
    await app.handleHttpRequest('POST', '/api/v1/auth/request-otp', {}, { phone: '01011112222' });
    const httpRes = await app.handleHttpRequest('POST', '/api/v1/auth/verify-otp', {}, {
      phone: '01011112222',
      code: '1234',
      surface: 'CUSTOMER',
    });
    const is200 = httpRes.statusCode === 200;
    const resBody = httpRes.body as any;
    const token = resBody.data?.tokens?.accessToken;
    const jwt = token ? verifyAccessToken(token) : null;
    const roleIsCustomer = jwt?.role === 'ROLE_CUSTOMER';

    results.push({
      name: 'AUTH-02B1 [13]: POST /api/v1/auth/verify-otp with surface=CUSTOMER issues ROLE_CUSTOMER via HTTP handler',
      passed: is200 && roleIsCustomer,
      error: !is200 ? `Expected 200 OK, got ${httpRes.statusCode} (${JSON.stringify(resBody)})` : (!roleIsCustomer ? `Expected ROLE_CUSTOMER, got ${jwt?.role}` : undefined),
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [13]: HTTP Verify-OTP Endpoint Routing', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 14: Mandatory Surface Contract — Missing Surface Rejected with 400
  // --------------------------------------------------------------------------
  try {
    await app.handleHttpRequest('POST', '/api/v1/auth/request-otp', {}, { phone: '01011112222' });
    const missingSurfaceRes = await app.handleHttpRequest('POST', '/api/v1/auth/verify-otp', {}, {
      phone: '01011112222',
      code: '1234',
    });
    const is400 = missingSurfaceRes.statusCode === 400;
    const isErrorCode = (missingSurfaceRes.body as any)?.error?.code === 'MISSING_OR_INVALID_AUTH_SURFACE';
    results.push({
      name: 'AUTH-02B1 [14]: POST /api/v1/auth/verify-otp with missing surface rejected with 400 Bad Request',
      passed: is400 && isErrorCode,
      error: !is400 ? `Expected 400, got ${missingSurfaceRes.statusCode}` : undefined,
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [14]: Missing Surface Validation', passed: false, error: err.message });
  }

  // --------------------------------------------------------------------------
  // TEST 15: Invalid Surface Value Rejected with 400
  // --------------------------------------------------------------------------
  try {
    await app.handleHttpRequest('POST', '/api/v1/auth/request-otp', {}, { phone: '01011112222' });
    const invalidSurfaceRes = await app.handleHttpRequest('POST', '/api/v1/auth/verify-otp', {}, {
      phone: '01011112222',
      code: '1234',
      surface: 'ADMIN',
    });
    const is400 = invalidSurfaceRes.statusCode === 400;
    const isErrorCode = (invalidSurfaceRes.body as any)?.error?.code === 'MISSING_OR_INVALID_AUTH_SURFACE';
    results.push({
      name: 'AUTH-02B1 [15]: POST /api/v1/auth/verify-otp with invalid surface (ADMIN) rejected with 400 Bad Request',
      passed: is400 && isErrorCode,
      error: !is400 ? `Expected 400, got ${invalidSurfaceRes.statusCode}` : undefined,
    });
  } catch (err: any) {
    results.push({ name: 'AUTH-02B1 [15]: Invalid Surface Validation', passed: false, error: err.message });
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  return { total: results.length, passed, failed, results };
}
