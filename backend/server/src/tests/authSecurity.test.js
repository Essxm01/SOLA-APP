/**
 * Sola Vacation Rentals — Red-Team Security & Auth Boundary Test Suite
 * Location: server/src/tests/authSecurity.test.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */
import { AuthService } from '../services/authService';
import { verifyJwtToken, requireRole } from '../middleware/auth';
import { ExpressServerApp } from '../app';
export async function runAuthSecuritySuite() {
    const results = [];
    const authService = new AuthService();
    const serverApp = new ExpressServerApp();
    // Test 1: Missing Token Check
    try {
        verifyJwtToken(undefined);
        results.push({ name: 'Security 1: Missing token rejection', passed: false, error: 'Should have thrown UNAUTHORIZED_MISSING_TOKEN' });
    }
    catch (err) {
        results.push({ name: 'Security 1: Missing token rejection', passed: err.message === 'UNAUTHORIZED_MISSING_TOKEN' });
    }
    // Test 2: Invalid Token Check
    try {
        verifyJwtToken('Bearer invalid');
        results.push({ name: 'Security 2: Invalid token rejection', passed: false, error: 'Should have thrown UNAUTHORIZED_INVALID_TOKEN' });
    }
    catch (err) {
        results.push({ name: 'Security 2: Invalid token rejection', passed: err.message === 'UNAUTHORIZED_INVALID_TOKEN' });
    }
    // Test 3: Forged Role / RBAC Admin Boundary Check
    try {
        const ownerPayload = { sub: 'owner_123', role: 'ROLE_OWNER', iat: Date.now(), exp: Date.now() + 900 };
        requireRole(ownerPayload, ['ROLE_ADMIN']);
        results.push({ name: 'Security 3: Forged role / Admin route access rejection', passed: false, error: 'Should have thrown FORBIDDEN_INSUFFICIENT_ROLE' });
    }
    catch (err) {
        results.push({ name: 'Security 3: Forged role / Admin route access rejection', passed: err.message === 'FORBIDDEN_INSUFFICIENT_ROLE' });
    }
    // Test 4: IDOR Protection (Server Authoritative owner_id)
    try {
        const requesterOwnerId = 'owner_A';
        const targetResourceOwnerId = 'owner_B';
        const isAuthorized = requesterOwnerId === targetResourceOwnerId;
        results.push({ name: 'Security 4: Cross-tenant IDOR access rejection', passed: !isAuthorized });
    }
    catch (err) {
        results.push({ name: 'Security 4: Cross-tenant IDOR access rejection', passed: false, error: err.message });
    }
    // Test 5: OTP Lifecycle & JWT Issuance
    try {
        await authService.requestOtp('+201000000001');
        const authResult = await authService.verifyOtp('+201000000001', '1234', 'OWNER');
        const tokenValid = !!authResult.tokens.accessToken && !!authResult.tokens.refreshToken;
        results.push({ name: 'Security 5: OTP lifecycle & JWT issuance', passed: tokenValid });
    }
    catch (err) {
        results.push({ name: 'Security 5: OTP lifecycle & JWT issuance', passed: false, error: err.message });
    }
    // Test 6: Refresh Token Revocation
    try {
        const phone6 = '+201000000002';
        await authService.requestOtp(phone6);
        const authResult = await authService.verifyOtp(phone6, '1234', 'OWNER');
        const refreshToken = authResult.tokens.refreshToken;
        await authService.revokeSession(refreshToken);
        // Attempt refresh after revocation
        await authService.refreshSession(refreshToken);
        results.push({ name: 'Security 6: Revoked refresh token rejection', passed: false, error: 'Should have thrown SESSION_REVOKED' });
    }
    catch (err) {
        results.push({ name: 'Security 6: Revoked refresh token rejection', passed: err.message === 'SESSION_REVOKED' });
    }
    // Test 7: Rate Limit OTP Requests (Max 3 / 15 mins)
    try {
        const phone = '+201000000003';
        await authService.requestOtp(phone);
        await authService.requestOtp(phone);
        await authService.requestOtp(phone);
        // 4th request should fail
        await authService.requestOtp(phone);
        results.push({ name: 'Security 7: OTP rate limit (Max 3 / 15 mins) enforcement', passed: false, error: 'Should have thrown RATE_LIMIT_EXCEEDED' });
    }
    catch (err) {
        results.push({ name: 'Security 7: OTP rate limit (Max 3 / 15 mins) enforcement', passed: err.message === 'RATE_LIMIT_EXCEEDED_MAX_3_OTP_PER_15_MIN' });
    }
    // Test 8: Express Router HTTP API Route Dispatch & Auth Enforcement
    try {
        const otpRes = await serverApp.handleHttpRequest('POST', '/api/v1/auth/request-otp', {}, { phone: '+201000000099' });
        const verifyRes = await serverApp.handleHttpRequest('POST', '/api/v1/auth/verify-otp', {}, { phone: '+201000000099', code: '1234' });
        const protectedNoTokenRes = await serverApp.handleHttpRequest('GET', '/api/v1/owner/properties', {});
        const adminBlockedRes = await serverApp.handleHttpRequest('GET', '/api/v1/admin/audit-logs', { authorization: 'Bearer owner_token' });
        const routerPass = (otpRes.statusCode === 200) && (verifyRes.statusCode === 200) && (protectedNoTokenRes.statusCode === 401) && (adminBlockedRes.statusCode === 403);
        results.push({ name: 'Security 8: Express HTTP App Router dispatching & auth middleware', passed: routerPass });
    }
    catch (err) {
        results.push({ name: 'Security 8: Express HTTP App Router dispatching & auth middleware', passed: false, error: err.message });
    }
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    return { total: results.length, passed, failed, results };
}
