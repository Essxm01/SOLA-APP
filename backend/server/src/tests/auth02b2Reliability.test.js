/**
 * Sola Vacation Rentals — AUTH-02B2 Authentication Runtime Reliability Test Suite
 * Location: server/src/tests/auth02b2Reliability.test.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */
import { AuthService } from '../services/authService.js';
import { verifyAccessToken, verifyRefreshToken } from '../services/jwtService.js';
import { ExpressServerApp } from '../app.js';
import { dbUsersStore, dbOwnersStore } from '../services/authService.js';
export async function runAuth02b2ReliabilitySuite() {
    const results = [];
    const serverApp = new ExpressServerApp();
    // Test 1: OTP challenge state survives separate AuthService instances (simulating separate Worker isolates)
    try {
        const testPhone = '+201088880001';
        const isolateA = new AuthService();
        const isolateB = new AuthService();
        await isolateA.requestOtp(testPhone);
        const verifyResult = await isolateB.verifyOtp(testPhone, '1234', 'CUSTOMER');
        const pass = !!verifyResult.tokens.accessToken && !!verifyResult.tokens.refreshToken;
        results.push({
            name: 'AUTH-02B2 [1]: OTP challenge requested on Isolate A verified successfully on Isolate B',
            passed: pass,
        });
    }
    catch (err) {
        results.push({
            name: 'AUTH-02B2 [1]: OTP challenge requested on Isolate A verified successfully on Isolate B',
            passed: false,
            error: err.message,
        });
    }
    // Test 2: CUSTOMER login issues ROLE_CUSTOMER
    try {
        const testPhone = '+201088880002';
        const authService = new AuthService();
        await authService.requestOtp(testPhone);
        const result = await authService.verifyOtp(testPhone, '1234', 'CUSTOMER');
        const decodedAccess = verifyAccessToken(result.tokens.accessToken);
        const decodedRefresh = verifyRefreshToken(result.tokens.refreshToken);
        const pass = decodedAccess.role === 'ROLE_CUSTOMER' && decodedRefresh.role === 'ROLE_CUSTOMER';
        results.push({
            name: 'AUTH-02B2 [2]: CUSTOMER login issues tokens with ROLE_CUSTOMER',
            passed: pass,
        });
    }
    catch (err) {
        results.push({
            name: 'AUTH-02B2 [2]: CUSTOMER login issues tokens with ROLE_CUSTOMER',
            passed: false,
            error: err.message,
        });
    }
    // Test 3: Existing Owner authenticating on OWNER surface gets ROLE_OWNER; on CUSTOMER surface gets ROLE_CUSTOMER with same human UUID
    try {
        const testPhone = '+201088880003';
        const existingOwnerId = '00000000-0000-4000-8000-201088880003';
        // Seed existing owner in memory store
        dbUsersStore.set(testPhone, {
            id: existingOwnerId,
            phoneNumber: testPhone,
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        dbOwnersStore.set(existingOwnerId, {
            id: existingOwnerId,
            phoneNumber: testPhone,
            fullName: 'مالك صولا التجريبي',
            status: 'ACTIVE',
            verificationStatus: 'VERIFIED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        const authService = new AuthService();
        // CUSTOMER login
        await authService.requestOtp(testPhone);
        const custResult = await authService.verifyOtp(testPhone, '1234', 'CUSTOMER');
        // OWNER login
        await authService.requestOtp(testPhone);
        const ownerResult = await authService.verifyOtp(testPhone, '1234', 'OWNER');
        const custDecoded = verifyAccessToken(custResult.tokens.accessToken);
        const ownerDecoded = verifyAccessToken(ownerResult.tokens.accessToken);
        const sameUuid = custDecoded.sub === existingOwnerId && ownerDecoded.sub === existingOwnerId;
        const correctRoles = custDecoded.role === 'ROLE_CUSTOMER' && ownerDecoded.role === 'ROLE_OWNER';
        results.push({
            name: 'AUTH-02B2 [3]: Same human UUID preserved across CUSTOMER (ROLE_CUSTOMER) and OWNER (ROLE_OWNER)',
            passed: sameUuid && correctRoles,
        });
    }
    catch (err) {
        results.push({
            name: 'AUTH-02B2 [3]: Same human UUID preserved across CUSTOMER (ROLE_CUSTOMER) and OWNER (ROLE_OWNER)',
            passed: false,
            error: err.message,
        });
    }
    // Test 4: Refresh token flow preserves original session role (CUSTOMER session refreshes as ROLE_CUSTOMER)
    try {
        const testPhone = '+201088880004';
        const authService = new AuthService();
        await authService.requestOtp(testPhone);
        const loginResult = await authService.verifyOtp(testPhone, '1234', 'CUSTOMER');
        const refreshResult = await authService.refreshSession(loginResult.tokens.refreshToken);
        const newDecoded = verifyAccessToken(refreshResult.accessToken);
        const pass = newDecoded.role === 'ROLE_CUSTOMER' && newDecoded.sub === loginResult.user.id;
        results.push({
            name: 'AUTH-02B2 [4]: CUSTOMER session refresh produces new access token with ROLE_CUSTOMER',
            passed: pass,
        });
    }
    catch (err) {
        results.push({
            name: 'AUTH-02B2 [4]: CUSTOMER session refresh produces new access token with ROLE_CUSTOMER',
            passed: false,
            error: err.message,
        });
    }
    // Test 5: Refresh token flow preserves original session role (OWNER session refreshes as ROLE_OWNER)
    try {
        const testPhone = '+201088880005';
        const ownerId = '00000000-0000-4000-8000-201088880005';
        dbUsersStore.set(testPhone, { id: ownerId, phoneNumber: testPhone, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        dbOwnersStore.set(ownerId, { id: ownerId, phoneNumber: testPhone, fullName: 'مالك تجريبي 5', status: 'ACTIVE', verificationStatus: 'VERIFIED', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        const authService = new AuthService();
        await authService.requestOtp(testPhone);
        const loginResult = await authService.verifyOtp(testPhone, '1234', 'OWNER');
        const refreshResult = await authService.refreshSession(loginResult.tokens.refreshToken);
        const newDecoded = verifyAccessToken(refreshResult.accessToken);
        const pass = newDecoded.role === 'ROLE_OWNER' && newDecoded.sub === ownerId;
        results.push({
            name: 'AUTH-02B2 [5]: OWNER session refresh produces new access token with ROLE_OWNER',
            passed: pass,
        });
    }
    catch (err) {
        results.push({
            name: 'AUTH-02B2 [5]: OWNER session refresh produces new access token with ROLE_OWNER',
            passed: false,
            error: err.message,
        });
    }
    // Test 6: Server-side logout revokes refresh token and subsequent refresh is rejected
    try {
        const testPhone = '+201088880006';
        const authService = new AuthService();
        await authService.requestOtp(testPhone);
        const loginResult = await authService.verifyOtp(testPhone, '1234', 'CUSTOMER');
        // Revoke session
        await authService.revokeSession(loginResult.tokens.refreshToken);
        // Attempt refresh after logout -> MUST fail
        let failedCleanly = false;
        try {
            await authService.refreshSession(loginResult.tokens.refreshToken);
        }
        catch (err) {
            failedCleanly = err.message === 'SESSION_REVOKED';
        }
        results.push({
            name: 'AUTH-02B2 [6]: Server-side session revocation prevents subsequent token refresh',
            passed: failedCleanly,
        });
    }
    catch (err) {
        results.push({
            name: 'AUTH-02B2 [6]: Server-side session revocation prevents subsequent token refresh',
            passed: false,
            error: err.message,
        });
    }
    // Test 7: HTTP API: POST /api/v1/auth/refresh returns 200 on active session, 401 on revoked
    try {
        const testPhone = '+201088880007';
        await serverApp.handleHttpRequest('POST', '/api/v1/auth/request-otp', {}, { phone: testPhone });
        const verifyRes = await serverApp.handleHttpRequest('POST', '/api/v1/auth/verify-otp', {}, { phone: testPhone, code: '1234', surface: 'CUSTOMER' });
        const refreshToken = verifyRes.body.data.tokens.refreshToken;
        // HTTP Refresh
        const refreshRes = await serverApp.handleHttpRequest('POST', '/api/v1/auth/refresh', {}, { refreshToken });
        const refreshOk = refreshRes.statusCode === 200 && !!refreshRes.body.data?.accessToken;
        // HTTP Revoke (Logout)
        const revokeRes = await serverApp.handleHttpRequest('POST', '/api/v1/auth/revoke', {}, { refreshToken });
        const revokeOk = revokeRes.statusCode === 200 && revokeRes.body.data?.success === true;
        // HTTP Refresh after Revoke -> must return 401
        const postRevokeRefresh = await serverApp.handleHttpRequest('POST', '/api/v1/auth/refresh', {}, { refreshToken });
        const rejectedAfterRevoke = postRevokeRefresh.statusCode === 401;
        results.push({
            name: 'AUTH-02B2 [7]: HTTP /auth/refresh (200), /auth/revoke (200), post-logout refresh (401)',
            passed: refreshOk && revokeOk && rejectedAfterRevoke,
        });
    }
    catch (err) {
        results.push({
            name: 'AUTH-02B2 [7]: HTTP /auth/refresh (200), /auth/revoke (200), post-logout refresh (401)',
            passed: false,
            error: err.message,
        });
    }
    // Test 8: Admin Authentication remains completely isolated in admin_users / signs ROLE_ADMIN
    try {
        const authService = new AuthService();
        const adminResult = await authService.adminLogin('admin@sola.com', 'AdminPassword2026!');
        const decoded = verifyAccessToken(adminResult.tokens.accessToken);
        const pass = decoded.role === 'ROLE_ADMIN' && adminResult.admin.email === 'admin@sola.com';
        results.push({
            name: 'AUTH-02B2 [8]: Admin authentication isolated, signs ROLE_ADMIN, unmerged from user sessions',
            passed: pass,
        });
    }
    catch (err) {
        results.push({
            name: 'AUTH-02B2 [8]: Admin authentication isolated, signs ROLE_ADMIN, unmerged from user sessions',
            passed: false,
            error: err.message,
        });
    }
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    return { total, passed, failed, results };
}
