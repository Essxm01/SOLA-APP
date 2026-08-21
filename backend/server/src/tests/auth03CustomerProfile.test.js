/**
 * Suite 19: AUTH-03 Renter Real Account + Auth & Profile UX
 * Master Source of Truth: AUTH-03 Specification
 */
import { ExpressServerApp } from '../app.js';
import { signAccessToken } from '../services/jwtService.js';
export async function runAuth03Tests() {
    const results = [];
    const app = new ExpressServerApp();
    // Test 1: GET /api/v1/customer/profile with valid ROLE_CUSTOMER returns profile
    try {
        const testUserId = '00000000-0000-4000-8000-201012345678';
        const customerToken = signAccessToken({
            sub: testUserId,
            role: 'ROLE_CUSTOMER',
            phone: '+201012345678',
        });
        const response = await app.handleHttpRequest('GET', '/api/v1/customer/profile', { authorization: `Bearer ${customerToken}` }, {});
        if (response.statusCode !== 200) {
            throw new Error(`Expected status 200, got ${response.statusCode}`);
        }
        if (!response.body.success || response.body.data?.id !== testUserId) {
            throw new Error(`Expected profile for ${testUserId}, got ${JSON.stringify(response.body)}`);
        }
        results.push({ name: '[19.1] Customer Profile GET Returns Real Identity', passed: true });
    }
    catch (err) {
        results.push({ name: '[19.1] Customer Profile GET Returns Real Identity', passed: false, error: err.message });
    }
    // Test 2: PATCH /api/v1/customer/profile updates full_name
    try {
        const testUserId = '00000000-0000-4000-8000-201012345678';
        const customerToken = signAccessToken({
            sub: testUserId,
            role: 'ROLE_CUSTOMER',
            phone: '+201012345678',
        });
        const newName = 'أحمد محمود القاضي';
        const response = await app.handleHttpRequest('PATCH', '/api/v1/customer/profile', { authorization: `Bearer ${customerToken}` }, { fullName: newName });
        if (response.statusCode !== 200) {
            throw new Error(`Expected status 200, got ${response.statusCode}`);
        }
        if (response.body.data?.fullName !== newName) {
            throw new Error(`Expected fullName to be "${newName}", got "${response.body.data?.fullName}"`);
        }
        results.push({ name: '[19.2] Customer Profile PATCH Updates Full Name in users', passed: true });
    }
    catch (err) {
        results.push({ name: '[19.2] Customer Profile PATCH Updates Full Name in users', passed: false, error: err.message });
    }
    // Test 3: PATCH /api/v1/customer/profile rejects invalid name (<2 chars)
    try {
        const testUserId = '00000000-0000-4000-8000-201012345678';
        const customerToken = signAccessToken({
            sub: testUserId,
            role: 'ROLE_CUSTOMER',
            phone: '+201012345678',
        });
        const response = await app.handleHttpRequest('PATCH', '/api/v1/customer/profile', { authorization: `Bearer ${customerToken}` }, { fullName: 'أ' });
        if (response.statusCode !== 400 || response.body.error?.code !== 'INVALID_FULL_NAME') {
            throw new Error(`Expected 400 INVALID_FULL_NAME, got ${response.statusCode} (${response.body.error?.code})`);
        }
        results.push({ name: '[19.3] Customer Profile PATCH Rejects Invalid Short Name (400)', passed: true });
    }
    catch (err) {
        results.push({ name: '[19.3] Customer Profile PATCH Rejects Invalid Short Name (400)', passed: false, error: err.message });
    }
    // Test 4: Role Isolation: ROLE_OWNER cannot access /api/v1/customer/profile
    try {
        const ownerToken = signAccessToken({
            sub: '00000000-0000-4000-8000-201012345678',
            role: 'ROLE_OWNER',
            phone: '+201012345678',
        });
        const response = await app.handleHttpRequest('GET', '/api/v1/customer/profile', { authorization: `Bearer ${ownerToken}` }, {});
        if (response.statusCode !== 403) {
            throw new Error(`Expected status 403 Forbidden for ROLE_OWNER on customer route, got ${response.statusCode}`);
        }
        results.push({ name: '[19.4] Role Isolation: OWNER Token Forbidden on Customer Profile (403)', passed: true });
    }
    catch (err) {
        results.push({ name: '[19.4] Role Isolation: OWNER Token Forbidden on Customer Profile (403)', passed: false, error: err.message });
    }
    // Test 5: Public Search Route is accessible without auth
    try {
        const response = await app.handleHttpRequest('GET', '/api/v1/customer/properties/search', {}, {});
        if (response.statusCode !== 200) {
            throw new Error(`Expected status 200 for public search, got ${response.statusCode}`);
        }
        results.push({ name: '[19.5] Public Search Route Accessible Unauthenticated (200)', passed: true });
    }
    catch (err) {
        results.push({ name: '[19.5] Public Search Route Accessible Unauthenticated (200)', passed: false, error: err.message });
    }
    // Test 6: Unauthenticated Profile Request is Rejected (401)
    try {
        const response = await app.handleHttpRequest('GET', '/api/v1/customer/profile', {}, {});
        if (response.statusCode !== 401) {
            throw new Error(`Expected status 401 for unauthenticated profile request, got ${response.statusCode}`);
        }
        results.push({ name: '[19.6] Protected Profile Requires Valid Authentication (401)', passed: true });
    }
    catch (err) {
        results.push({ name: '[19.6] Protected Profile Requires Valid Authentication (401)', passed: false, error: err.message });
    }
    return results;
}
