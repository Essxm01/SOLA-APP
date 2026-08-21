/**
 * Sola / Konfrm Vacation Rentals — CUSTOMER ACCOUNT-01: Professional Renter Account Hub Test Suite
 * Location: server/src/tests/customerAccount01.test.ts
 */
import { ExpressServerApp } from '../app.js';
import { AuthService, dbUsersStore, dbOwnersStore } from '../services/authService.js';
export async function runCustomerAccount01Suite() {
    const results = [];
    const app = new ExpressServerApp();
    const authService = new AuthService();
    const randSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    // Test Customer Identity
    const customerPhone = `+2010${randSuffix}01`;
    const customerId = crypto.randomUUID();
    dbUsersStore.set(customerPhone, {
        id: customerId,
        phoneNumber: customerPhone,
        phoneVerifiedAt: new Date().toISOString(),
        fullName: 'يوسف أحمد القاضي',
        email: 'youssef@example.eg',
        avatarUrl: null,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    await authService.requestOtp(customerPhone);
    const authRes = await authService.verifyOtp(customerPhone, '1234', 'CUSTOMER');
    const customerToken = authRes.tokens.accessToken;
    // --------------------------------------------------------------------------
    // TEST 1: GET /api/v1/customer/account/summary returns real metrics (200 OK)
    // --------------------------------------------------------------------------
    try {
        const res = await app.handleHttpRequest('GET', '/api/v1/customer/account/summary', {
            authorization: `Bearer ${customerToken}`,
        });
        const is200 = res.statusCode === 200;
        const body = res.body;
        const hasMetrics = body.success === true &&
            typeof body.data.confirmedBookingsCount === 'number' &&
            typeof body.data.upcomingStaysCount === 'number' &&
            typeof body.data.totalBookingsCount === 'number' &&
            typeof body.data.totalDepositsPaidEgp === 'number';
        results.push({
            name: '[20.1] Customer Account Summary GET Returns Real Financial/Stay Metrics (200 OK)',
            passed: is200 && hasMetrics,
            error: is200 && hasMetrics ? undefined : `Expected 200 with metric counts, got ${res.statusCode} body: ${JSON.stringify(body)}`,
        });
    }
    catch (err) {
        results.push({ name: '[20.1] Customer Account Summary GET', passed: false, error: err.message });
    }
    // --------------------------------------------------------------------------
    // TEST 2: GET /api/v1/customer/payments returns real ledger & hides owner financial data
    // --------------------------------------------------------------------------
    try {
        const res = await app.handleHttpRequest('GET', '/api/v1/customer/payments', {
            authorization: `Bearer ${customerToken}`,
        });
        const is200 = res.statusCode === 200;
        const body = res.body;
        const isArray = body.success === true && Array.isArray(body.data);
        // Verify zero leakage of owner commission or owner net
        const bodyString = JSON.stringify(body);
        const noOwnerNetLeak = !bodyString.includes('ownerNet') && !bodyString.includes('solaCommission');
        results.push({
            name: '[20.2] Customer Payments Endpoint Returns Real Ledger & Strictly Hides Owner Net/Commission',
            passed: is200 && isArray && noOwnerNetLeak,
            error: is200 && isArray && noOwnerNetLeak ? undefined : `Leak check failed or invalid status: ${res.statusCode}`,
        });
    }
    catch (err) {
        results.push({ name: '[20.2] Customer Payments Ledger', passed: false, error: err.message });
    }
    // --------------------------------------------------------------------------
    // TEST 3: Unauthenticated Access to /customer/account/summary & /customer/payments (401)
    // --------------------------------------------------------------------------
    try {
        const resSummary = await app.handleHttpRequest('GET', '/api/v1/customer/account/summary');
        const resPayments = await app.handleHttpRequest('GET', '/api/v1/customer/payments');
        const blocked = resSummary.statusCode === 401 && resPayments.statusCode === 401;
        results.push({
            name: '[20.3] Unauthenticated Access to Account Summary & Payments Returns 401 Unauthorized',
            passed: blocked,
            error: blocked ? undefined : `Expected 401/401, got ${resSummary.statusCode}/${resPayments.statusCode}`,
        });
    }
    catch (err) {
        results.push({ name: '[20.3] Unauthenticated Account Access', passed: false, error: err.message });
    }
    // --------------------------------------------------------------------------
    // TEST 4: Role Isolation: OWNER Token Forbidden on Customer Account Routes (403)
    // --------------------------------------------------------------------------
    try {
        const ownerPhone = `+2010${randSuffix}02`;
        const ownerId = crypto.randomUUID();
        dbUsersStore.set(ownerPhone, { id: ownerId, phoneNumber: ownerPhone, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        dbOwnersStore.set(ownerId, { id: ownerId, phoneNumber: ownerPhone, fullName: 'مالك منفصل', status: 'ACTIVE', verificationStatus: 'VERIFIED', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        await authService.requestOtp(ownerPhone);
        const ownerToken = (await authService.verifyOtp(ownerPhone, '1234', 'OWNER')).tokens.accessToken;
        const resSummary = await app.handleHttpRequest('GET', '/api/v1/customer/account/summary', {
            authorization: `Bearer ${ownerToken}`,
        });
        const is403 = resSummary.statusCode === 403;
        results.push({
            name: '[20.4] Role Isolation: OWNER Token Forbidden on Customer Account Hub (403 Forbidden)',
            passed: is403,
            error: is403 ? undefined : `Expected 403, got ${resSummary.statusCode}`,
        });
    }
    catch (err) {
        results.push({ name: '[20.4] Role Isolation on Account Hub', passed: false, error: err.message });
    }
    // --------------------------------------------------------------------------
    // TEST 5: Customer Profile Update Does NOT Overwrite Independent Owner Profile
    // --------------------------------------------------------------------------
    try {
        const dualPhone = `+2010${randSuffix}03`;
        const dualId = crypto.randomUUID();
        // Seed canonical user and independent owner business profile
        dbUsersStore.set(dualPhone, {
            id: dualId,
            phoneNumber: dualPhone,
            fullName: 'مستأجر أصلي',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        dbOwnersStore.set(dualId, {
            id: dualId,
            phoneNumber: dualPhone,
            fullName: 'شركة الساحل للاستثمار العقاري',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        await authService.requestOtp(dualPhone);
        const custAuth = await authService.verifyOtp(dualPhone, '1234', 'CUSTOMER');
        // Customer updates their personal name
        const patchRes = await app.handleHttpRequest('PATCH', '/api/v1/customer/profile', { authorization: `Bearer ${custAuth.tokens.accessToken}` }, { fullName: 'كريم محمود المنشاوي' });
        const isPatchOk = patchRes.statusCode === 200;
        const updatedUser = dbUsersStore.get(dualPhone);
        const unchangedOwner = dbOwnersStore.get(dualId);
        const userUpdated = updatedUser?.fullName === 'كريم محمود المنشاوي';
        const ownerPreserved = unchangedOwner?.fullName === 'شركة الساحل للاستثمار العقاري';
        results.push({
            name: '[20.5] Data Integrity: Customer Profile Update Does NOT Mirror into or Overwrite Independent Owner Profile',
            passed: isPatchOk && userUpdated && ownerPreserved,
            error: isPatchOk && userUpdated && ownerPreserved ? undefined : `Integrity failed: patchOk=${isPatchOk}, userUpdated=${userUpdated}, ownerPreserved=${ownerPreserved}`,
        });
    }
    catch (err) {
        results.push({ name: '[20.5] Profile Integrity & Decoupling', passed: false, error: err.message });
    }
    // --------------------------------------------------------------------------
    // TEST 6: Customer Profile Optional Email Update & Persistence (200 OK)
    // --------------------------------------------------------------------------
    try {
        const emailPhone = `+2010${randSuffix}04`;
        const emailUserId = crypto.randomUUID();
        dbUsersStore.set(emailPhone, {
            id: emailUserId,
            phoneNumber: emailPhone,
            fullName: 'مستأجر بريد',
            email: null,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        await authService.requestOtp(emailPhone);
        const emailAuth = await authService.verifyOtp(emailPhone, '1234', 'CUSTOMER');
        // 1. Update with valid email
        const validPatch = await app.handleHttpRequest('PATCH', '/api/v1/customer/profile', { authorization: `Bearer ${emailAuth.tokens.accessToken}` }, { email: 'renter.test@konfrm.eg' });
        const is200 = validPatch.statusCode === 200 && validPatch.body.data?.email === 'renter.test@konfrm.eg';
        // 2. Fetch profile and verify persisted email
        const getProfile = await app.handleHttpRequest('GET', '/api/v1/customer/profile', { authorization: `Bearer ${emailAuth.tokens.accessToken}` });
        const persisted = getProfile.statusCode === 200 && getProfile.body.data?.email === 'renter.test@konfrm.eg';
        results.push({
            name: '[20.6] Customer Profile Optional Email Update & Persistence in Canonical users (200 OK)',
            passed: is200 && persisted,
            error: is200 && persisted ? undefined : `Expected 200 + persisted email, got patch=${validPatch.statusCode}, get=${getProfile.statusCode}`,
        });
    }
    catch (err) {
        results.push({ name: '[20.6] Optional Email Persistence', passed: false, error: err.message });
    }
    // --------------------------------------------------------------------------
    // TEST 7: Customer Profile Rejects Invalid Email Format (400 Bad Request)
    // --------------------------------------------------------------------------
    try {
        const invPhone = `+2010${randSuffix}05`;
        const invUserId = crypto.randomUUID();
        dbUsersStore.set(invPhone, {
            id: invUserId,
            phoneNumber: invPhone,
            fullName: 'فحص البريد',
            email: null,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        await authService.requestOtp(invPhone);
        const invAuth = await authService.verifyOtp(invPhone, '1234', 'CUSTOMER');
        const badPatch = await app.handleHttpRequest('PATCH', '/api/v1/customer/profile', { authorization: `Bearer ${invAuth.tokens.accessToken}` }, { email: 'not-a-valid-email' });
        const is400 = badPatch.statusCode === 400 && badPatch.body.error?.code === 'INVALID_EMAIL_FORMAT';
        results.push({
            name: '[20.7] Customer Profile Rejects Malformed Email with 400 INVALID_EMAIL_FORMAT',
            passed: is400,
            error: is400 ? undefined : `Expected 400 INVALID_EMAIL_FORMAT, got ${badPatch.statusCode}`,
        });
    }
    catch (err) {
        results.push({ name: '[20.7] Invalid Email Format Rejection', passed: false, error: err.message });
    }
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    return { total: results.length, passed, failed, results };
}
