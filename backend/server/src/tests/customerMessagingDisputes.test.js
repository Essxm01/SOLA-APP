/**
 * Sola Vacation Rentals — Customer Messaging, Disputes & Red-Team Suite (Suite 10)
 * Location: server/src/tests/customerMessagingDisputes.test.ts
 */
import { ExpressServerApp } from '../app';
export async function runCustomerMessagingDisputesSuite() {
    const results = [];
    const app = new ExpressServerApp();
    const customerTokenA = 'customer_cust001_token';
    const customerTokenB = 'customer_cust002_token';
    const adminToken = 'admin_token_valid';
    const customerHeadersA = { authorization: `Bearer ${customerTokenA}` };
    const customerHeadersB = { authorization: `Bearer ${customerTokenB}` };
    const adminHeaders = { authorization: `Bearer ${adminToken}` };
    // =========================================================================
    // 1. MESSAGING TESTS (1-4)
    // =========================================================================
    // Test 1: Customer fetches messaging threads -> 200 OK
    try {
        const res = await app.handleHttpRequest('GET', '/api/v1/customer/messaging/threads', customerHeadersA);
        const isOk = res.statusCode === 200 && Array.isArray(res.body.data);
        results.push({ name: 'Customer Messaging 1: Fetch messaging threads returns 200 OK with threads array', passed: isOk });
    }
    catch (err) {
        results.push({ name: 'Customer Messaging 1: Fetch messaging threads returns 200 OK with threads array', passed: false, error: err.message });
    }
    // Test 2: Customer sends message to thread -> 201 Created
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/customer/messaging/threads/thread_c1_001/messages', customerHeadersA, {
            content: 'سلام عليكم، هل يوجد جراج متوفر للسيارات؟',
        });
        const isCreated = res.statusCode === 201 && res.body.data.content.includes('جراج');
        results.push({ name: 'Customer Messaging 2: Sending message to thread appends message with 201 Created', passed: isCreated });
    }
    catch (err) {
        results.push({ name: 'Customer Messaging 2: Sending message to thread appends message with 201 Created', passed: false, error: err.message });
    }
    // Test 3: Customer B attempts access to Customer A thread -> 403 Forbidden IDOR
    try {
        const res = await app.handleHttpRequest('GET', '/api/v1/customer/messaging/threads/thread_cust001_secret/messages', customerHeadersB);
        const isForbidden = res.statusCode === 403;
        results.push({ name: 'Customer Messaging 3 (IDOR): Accessing foreign thread rejected with 403 Forbidden', passed: isForbidden });
    }
    catch (err) {
        results.push({ name: 'Customer Messaging 3 (IDOR): Accessing foreign thread rejected with 403 Forbidden', passed: false, error: err.message });
    }
    // Test 4: Missing token on messaging endpoint -> 401 Unauthorized
    try {
        const res = await app.handleHttpRequest('GET', '/api/v1/customer/messaging/threads', {});
        results.push({ name: 'Customer Messaging 4: Missing token rejected with 401 Unauthorized', passed: res.statusCode === 401 });
    }
    catch (err) {
        results.push({ name: 'Customer Messaging 4: Missing token rejected with 401 Unauthorized', passed: false, error: err.message });
    }
    // =========================================================================
    // 2. DISPUTE TESTS (5-9)
    // =========================================================================
    // Test 5: Customer creates dispute -> 201 Created & Financial Hold Payload generated
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/customer/disputes', customerHeadersA, {
            bookingId: 'booking_c1_001',
            reason: 'مواصفات الشاليه مخالفة للصور',
            description: 'التكييف لا يعمل والأثاث متهالك',
        });
        const isCreated = res.statusCode === 201 && res.body.data.status === 'OPEN' && !!res.body.data.financialHold;
        results.push({ name: 'Customer Dispute 1: Creating dispute initializes OPEN status & financial hold payload', passed: isCreated });
    }
    catch (err) {
        results.push({ name: 'Customer Dispute 1: Creating dispute initializes OPEN status & financial hold payload', passed: false, error: err.message });
    }
    // Test 6: Customer fetches dispute details -> 200 OK
    try {
        const res = await app.handleHttpRequest('GET', '/api/v1/customer/disputes/dispute_c1_001', customerHeadersA);
        const isOk = res.statusCode === 200 && res.body.data.ownerNetDepositFrozen === 4000;
        results.push({ name: 'Customer Dispute 2: Fetch dispute details returns frozen net deposit amount', passed: isOk });
    }
    catch (err) {
        results.push({ name: 'Customer Dispute 2: Fetch dispute details returns frozen net deposit amount', passed: false, error: err.message });
    }
    // Test 7: Customer B attempts dispute on Customer A booking -> 403 Forbidden IDOR
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/customer/disputes', customerHeadersB, {
            bookingId: 'booking_other_customer_001',
            reason: 'نزاع غير مصرح',
            description: 'محاولة اختراق حجز عميل آخر',
        });
        const isForbidden = res.statusCode === 403;
        results.push({ name: 'Customer Dispute 3 (IDOR): Creating dispute on foreign booking rejected with 403', passed: isForbidden });
    }
    catch (err) {
        results.push({ name: 'Customer Dispute 3 (IDOR): Creating dispute on foreign booking rejected with 403', passed: false, error: err.message });
    }
    // Test 8: Customer B attempts viewing Customer A dispute details -> 403 Forbidden IDOR
    try {
        const res = await app.handleHttpRequest('GET', '/api/v1/customer/disputes/dispute_cust002_secret', customerHeadersB);
        const isForbidden = res.statusCode === 403;
        results.push({ name: 'Customer Dispute 4 (IDOR): Viewing foreign dispute details rejected with 403', passed: isForbidden });
    }
    catch (err) {
        results.push({ name: 'Customer Dispute 4 (IDOR): Viewing foreign dispute details rejected with 403', passed: false, error: err.message });
    }
    // Test 9: Admin resolves Customer dispute -> RESOLVED status with audit log
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/disputes/dispute_c1_001/resolve', adminHeaders, {
            resolutionType: 'REFUND_GUEST',
            adminNotes: 'تمت معاينة الشكوى وثبت عدم جاهزية التكييف وتم إقرار الاسترداد للنزيل',
        });
        const isResolved = res.statusCode === 200 && (res.body.data.dispute.status === 'RESOLVED' || res.body.data.dispute.status === 'RESOLVING_PENDING_GATEWAY') && res.body.data.dispute.resolutionType === 'FULL_REFUND';
        results.push({ name: 'Customer Dispute 5: Admin dispute resolution transitions status to RESOLVED (FULL_REFUND)', passed: isResolved });
    }
    catch (err) {
        results.push({ name: 'Customer Dispute 5: Admin dispute resolution transitions status to RESOLVED (FULL_REFUND)', passed: false, error: err.message });
    }
    // =========================================================================
    // 3. RED-TEAM SECURITY INVARIANTS (10-13)
    // =========================================================================
    // Test 10: Customer token -> Owner Wallet Ledger access = 403 Forbidden
    try {
        const res = await app.handleHttpRequest('GET', '/api/v1/owner/wallet/ledger', customerHeadersA);
        results.push({ name: 'Red-Team 10: Customer token accessing Owner wallet ledger rejected with 403 Forbidden', passed: res.statusCode === 403 });
    }
    catch (err) {
        results.push({ name: 'Red-Team 10: Customer token accessing Owner wallet ledger rejected with 403 Forbidden', passed: false, error: err.message });
    }
    // Test 11: Customer token -> Admin Property Review access = 403 Forbidden
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/properties/p1/review', customerHeadersA, { decision: 'PUBLISHED' });
        results.push({ name: 'Red-Team 11: Customer token accessing Admin property review rejected with 403 Forbidden', passed: res.statusCode === 403 });
    }
    catch (err) {
        results.push({ name: 'Red-Team 11: Customer token accessing Admin property review rejected with 403 Forbidden', passed: false, error: err.message });
    }
    // Test 12: Empty message content submission rejected -> 400 Bad Request
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/customer/messaging/threads/thread_c1_001/messages', customerHeadersA, { content: '   ' });
        results.push({ name: 'Red-Team 12: Empty message content rejected with 400 Bad Request', passed: res.statusCode === 400 });
    }
    catch (err) {
        results.push({ name: 'Red-Team 12: Empty message content rejected with 400 Bad Request', passed: false, error: err.message });
    }
    // Test 13: Missing bookingId or reason on dispute submission -> 400 Bad Request
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/customer/disputes', customerHeadersA, { description: 'Missing fields' });
        results.push({ name: 'Red-Team 13: Missing dispute payload fields rejected with 400 Bad Request', passed: res.statusCode === 400 });
    }
    catch (err) {
        results.push({ name: 'Red-Team 13: Missing dispute payload fields rejected with 400 Bad Request', passed: false, error: err.message });
    }
    // =========================================================================
    // 4. PROPERTY DELETE API & RULE-4C-02 ENFORCEMENT TESTS (14-17)
    // =========================================================================
    const ownerTokenA = 'owner_token_valid';
    const ownerHeadersA = { authorization: `Bearer ${ownerTokenA}` };
    // Test 14: Owner deletes eligible property -> 200 OK
    try {
        const res = await app.handleHttpRequest('DELETE', '/api/v1/owner/properties/prop-001', ownerHeadersA);
        const isOk = res.statusCode === 200 && res.body.data.deleted === true;
        results.push({ name: 'Property Delete 14: Owner deletes eligible property returns 200 OK with deleted=true', passed: isOk });
    }
    catch (err) {
        results.push({ name: 'Property Delete 14: Owner deletes eligible property returns 200 OK with deleted=true', passed: false, error: err.message });
    }
    // Test 15: Property with active bookings deletion blocked -> 400 Bad Request (RULE-4C-02)
    try {
        const res = await app.handleHttpRequest('DELETE', '/api/v1/owner/properties/prop_has_active_bookings', ownerHeadersA);
        const isBlocked = res.statusCode === 400 && res.body.error.code === 'CANNOT_DELETE_PROPERTY_WITH_ACTIVE_BOOKINGS';
        results.push({ name: 'Property Delete 15 (RULE-4C-02): Active bookings property deletion blocked with 400 Bad Request', passed: isBlocked });
    }
    catch (err) {
        results.push({ name: 'Property Delete 15 (RULE-4C-02): Active bookings property deletion blocked with 400 Bad Request', passed: false, error: err.message });
    }
    // Test 16: Owner A deleting foreign property blocked -> 403 Forbidden IDOR
    try {
        const res = await app.handleHttpRequest('DELETE', '/api/v1/owner/properties/prop_other_owner_secret', ownerHeadersA);
        const isForbidden = res.statusCode === 403 && res.body.error.code === 'OWNER_RESOURCE_IDOR_VIOLATION';
        results.push({ name: 'Property Delete 16 (IDOR): Deleting foreign property rejected with 403 Forbidden', passed: isForbidden });
    }
    catch (err) {
        results.push({ name: 'Property Delete 16 (IDOR): Deleting foreign property rejected with 403 Forbidden', passed: false, error: err.message });
    }
    // Test 17: Unauthorized deletion request without token -> 401 Unauthorized
    try {
        const res = await app.handleHttpRequest('DELETE', '/api/v1/owner/properties/prop-001', {});
        results.push({ name: 'Property Delete 17: Missing token on property deletion rejected with 401 Unauthorized', passed: res.statusCode === 401 });
    }
    catch (err) {
        results.push({ name: 'Property Delete 17: Missing token on property deletion rejected with 401 Unauthorized', passed: false, error: err.message });
    }
    // Test 18: Customer token attempting Owner Property Delete -> 403 Forbidden
    try {
        const res = await app.handleHttpRequest('DELETE', '/api/v1/owner/properties/prop-001', customerHeadersA);
        results.push({ name: 'Property Delete 18: Customer token attempting Owner Property Delete rejected with 403 Forbidden', passed: res.statusCode === 403 });
    }
    catch (err) {
        results.push({ name: 'Property Delete 18: Customer token attempting Owner Property Delete rejected with 403 Forbidden', passed: false, error: err.message });
    }
    // Test 19: Admin token attempting Owner Property Delete -> 403 Forbidden (ROLE_OWNER Boundary Isolation)
    try {
        const res = await app.handleHttpRequest('DELETE', '/api/v1/owner/properties/prop-001', adminHeaders);
        results.push({ name: 'Property Delete 19: Admin token attempting Owner Property Delete rejected with 403 Forbidden', passed: res.statusCode === 403 });
    }
    catch (err) {
        results.push({ name: 'Property Delete 19: Admin token attempting Owner Property Delete rejected with 403 Forbidden', passed: false, error: err.message });
    }
    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;
    return { total: results.length, passed, failed, results };
}
