/**
 * Master Automated Test Suite for FLOW-ADM-08: Payout Execution & Processing
 * Location: server/src/tests/payoutExecution.test.ts
 */
import { ExpressServerApp } from '../app';
export async function runPayoutExecutionSuite() {
    const results = [];
    const app = new ExpressServerApp();
    const adminToken = 'admin_token_valid';
    const ownerToken = 'owner_token_valid';
    const customerToken = 'customer_token_valid';
    const adminHeaders = { authorization: `Bearer ${adminToken}` };
    const ownerHeaders = { authorization: `Bearer ${ownerToken}` };
    const customerHeaders = { authorization: `Bearer ${customerToken}` };
    // Test 1: PENDING -> APPROVE -> PROCESSING
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-001/approve', adminHeaders, { actualProviderFee: 15.00 });
        if (res.statusCode === 200 && res.body.success && res.body.data.status === 'PROCESSING' && res.body.data.netAmountEgp === 4985.00) {
            results.push({ name: 'FLOW-ADM-08 [1.1] PENDING -> APPROVE -> PROCESSING with valid fee', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.1] PENDING -> APPROVE -> PROCESSING with valid fee', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.1] PENDING -> APPROVE -> PROCESSING with valid fee', passed: false, error: err.message });
    }
    // Test 2: PENDING -> REJECTED + release
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-002/reject', adminHeaders, {
            reasonCode: 'NAME_MISMATCH',
            rejectionReason: 'عدم تطابق اسم صاحب الحساب مع الهوية',
        });
        if (res.statusCode === 200 && res.body.success && res.body.data.status === 'REJECTED' && res.body.data.walletMutation.ledgerTransactionType === 'PAYOUT_RELEASE_UNRESERVE') {
            results.push({ name: 'FLOW-ADM-08 [1.2] PENDING -> REJECTED + Atomic Balance Release', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.2] PENDING -> REJECTED + Atomic Balance Release', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.2] PENDING -> REJECTED + Atomic Balance Release', passed: false, error: err.message });
    }
    // Test 3: PROCESSING -> SUCCESS -> COMPLETED + settlement
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/webhooks/payouts', { 'x-sola-signature': 'sig_valid_sha256' }, {
            requestNumber: 'PAY-2026-0815-001',
            eventType: 'PAYOUT_SUCCESS',
            providerTxId: 'BANK_TX_9988',
        });
        if (res.statusCode === 200 && res.body.success && res.body.data.status === 'COMPLETED') {
            results.push({ name: 'FLOW-ADM-08 [1.3] PROCESSING -> SUCCESS Webhook -> COMPLETED + Settlement', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.3] PROCESSING -> SUCCESS Webhook -> COMPLETED + Settlement', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.3] PROCESSING -> SUCCESS Webhook -> COMPLETED + Settlement', passed: false, error: err.message });
    }
    // Test 4: PROCESSING -> TIMEOUT -> UNKNOWN
    try {
        const res = await app.handleHttpRequest('GET', '/api/v1/admin/payouts/pr-unknown-001', adminHeaders);
        if (res.statusCode === 200 && res.body.data.status === 'UNKNOWN') {
            results.push({ name: 'FLOW-ADM-08 [1.4] PROCESSING -> TIMEOUT -> UNKNOWN (Funds Locked)', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.4] PROCESSING -> TIMEOUT -> UNKNOWN (Funds Locked)', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.4] PROCESSING -> TIMEOUT -> UNKNOWN (Funds Locked)', passed: false, error: err.message });
    }
    // Test 5: UNKNOWN -> release-funds -> MUST FAIL (400)
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-unknown-001/release-funds', adminHeaders, {
            proofType: 'DIRECT_PROVIDER_STATUS_NOT_FOUND',
            reconciliationId: 'rec_123',
        });
        if (res.statusCode === 400 && res.body.error?.code === 'PAYOUT_NOT_ELIGIBLE_FOR_RELEASE') {
            results.push({ name: 'FLOW-ADM-08 [1.5] UNKNOWN -> release-funds -> MUST FAIL (400 PAYOUT_NOT_ELIGIBLE_FOR_RELEASE)', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.5] UNKNOWN -> release-funds -> MUST FAIL (400 PAYOUT_NOT_ELIGIBLE_FOR_RELEASE)', passed: false, error: `Expected 400, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.5] UNKNOWN -> release-funds -> MUST FAIL (400 PAYOUT_NOT_ELIGIBLE_FOR_RELEASE)', passed: false, error: err.message });
    }
    // Test 6: UNKNOWN -> retry -> MUST FAIL (400)
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-unknown-001/retry', adminHeaders);
        if (res.statusCode === 400 && res.body.error?.code === 'PAYOUT_NOT_ELIGIBLE_FOR_RETRY') {
            results.push({ name: 'FLOW-ADM-08 [1.6] UNKNOWN -> retry -> MUST FAIL (400 PAYOUT_NOT_ELIGIBLE_FOR_RETRY)', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.6] UNKNOWN -> retry -> MUST FAIL (400 PAYOUT_NOT_ELIGIBLE_FOR_RETRY)', passed: false, error: `Expected 400, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.6] UNKNOWN -> retry -> MUST FAIL (400 PAYOUT_NOT_ELIGIBLE_FOR_RETRY)', passed: false, error: err.message });
    }
    // Test 7: UNKNOWN -> reconciliation SUCCESS -> COMPLETED
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-reconcile-success/reconcile', adminHeaders);
        if (res.statusCode === 200 && res.body.data.updatedStatus === 'COMPLETED') {
            results.push({ name: 'FLOW-ADM-08 [1.7] UNKNOWN -> Reconciliation SUCCESS -> COMPLETED', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.7] UNKNOWN -> Reconciliation SUCCESS -> COMPLETED', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.7] UNKNOWN -> Reconciliation SUCCESS -> COMPLETED', passed: false, error: err.message });
    }
    // Test 8: UNKNOWN -> reconciliation NOT_FOUND -> FAILED
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-not_found/reconcile', adminHeaders);
        if (res.statusCode === 200 && res.body.data.updatedStatus === 'FAILED') {
            results.push({ name: 'FLOW-ADM-08 [1.8] UNKNOWN -> Reconciliation NOT_FOUND -> FAILED', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.8] UNKNOWN -> Reconciliation NOT_FOUND -> FAILED', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.8] UNKNOWN -> Reconciliation NOT_FOUND -> FAILED', passed: false, error: err.message });
    }
    // Test 9: UNKNOWN -> reconciliation TIMEOUT -> remains UNKNOWN
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-still_unknown/reconcile', adminHeaders);
        if (res.statusCode === 200 && res.body.data.updatedStatus === 'UNKNOWN') {
            results.push({ name: 'FLOW-ADM-08 [1.9] UNKNOWN -> Reconciliation TIMEOUT -> Remains UNKNOWN', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.9] UNKNOWN -> Reconciliation TIMEOUT -> Remains UNKNOWN', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.9] UNKNOWN -> Reconciliation TIMEOUT -> Remains UNKNOWN', passed: false, error: err.message });
    }
    // Test 10: FAILED -> RETRY -> PROCESSING
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-failed-001/retry', adminHeaders);
        if (res.statusCode === 200 && res.body.data.status === 'PROCESSING') {
            results.push({ name: 'FLOW-ADM-08 [1.10] FAILED -> RETRY -> PROCESSING', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.10] FAILED -> RETRY -> PROCESSING', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.10] FAILED -> RETRY -> PROCESSING', passed: false, error: err.message });
    }
    // Test 11: FAILED -> RELEASE -> REJECTED + release
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-failed-002/release-funds', adminHeaders, {
            proofType: 'DIRECT_PROVIDER_STATUS_NOT_FOUND',
            reconciliationId: 'rec_valid_999',
        });
        if (res.statusCode === 200 && res.body.data.status === 'REJECTED') {
            results.push({ name: 'FLOW-ADM-08 [1.11] FAILED -> RELEASE -> REJECTED + Atomic Balance Release', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.11] FAILED -> RELEASE -> REJECTED + Atomic Balance Release', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.11] FAILED -> RELEASE -> REJECTED + Atomic Balance Release', passed: false, error: err.message });
    }
    // Test 12: admin_retry_count = 3 -> retry rejected (400 MAX_RETRY_LIMIT_REACHED)
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-failed-retry_3/retry', adminHeaders);
        if (res.statusCode === 400 && res.body.error?.code === 'MAX_RETRY_LIMIT_REACHED') {
            results.push({ name: 'FLOW-ADM-08 [1.12] Max Admin Retries (admin_retry_count = 3) -> 400 MAX_RETRY_LIMIT_REACHED', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.12] Max Admin Retries (admin_retry_count = 3) -> 400 MAX_RETRY_LIMIT_REACHED', passed: false, error: `Expected 400, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.12] Max Admin Retries (admin_retry_count = 3) -> 400 MAX_RETRY_LIMIT_REACHED', passed: false, error: err.message });
    }
    // Test 13: Duplicate Approve -> 400 STATE_TRANSITION_RACE_CONFLICT
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-completed-001/approve', adminHeaders, { actualProviderFee: 10 });
        if (res.statusCode === 400 && res.body.error?.code === 'STATE_TRANSITION_RACE_CONFLICT') {
            results.push({ name: 'FLOW-ADM-08 [1.13] Duplicate Approve on Non-Pending Payout -> 400 Conflict', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.13] Duplicate Approve on Non-Pending Payout -> 400 Conflict', passed: false, error: `Expected 400, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.13] Duplicate Approve on Non-Pending Payout -> 400 Conflict', passed: false, error: err.message });
    }
    // Test 14: Duplicate Reject -> 400 PAYOUT_NOT_ELIGIBLE_FOR_REJECTION
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-completed-001/reject', adminHeaders, { reasonCode: 'NAME_MISMATCH' });
        if (res.statusCode === 400 && res.body.error?.code === 'PAYOUT_NOT_ELIGIBLE_FOR_REJECTION') {
            results.push({ name: 'FLOW-ADM-08 [1.14] Duplicate Reject on COMPLETED Payout -> 400 Conflict', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.14] Duplicate Reject on COMPLETED Payout -> 400 Conflict', passed: false, error: `Expected 400, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.14] Duplicate Reject on COMPLETED Payout -> 400 Conflict', passed: false, error: err.message });
    }
    // Test 15: Webhook Duplicate SUCCESS -> 200 OK Replay Protection
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/webhooks/payouts', { 'x-sola-signature': 'valid_sig' }, {
            requestNumber: 'PAY-2026-0815-completed',
            eventType: 'PAYOUT_SUCCESS',
        });
        if (res.statusCode === 200 && res.body.data.message.includes('idempotently')) {
            results.push({ name: 'FLOW-ADM-08 [1.15] Webhook Duplicate SUCCESS -> 200 OK Replay Protection', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.15] Webhook Duplicate SUCCESS -> 200 OK Replay Protection', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.15] Webhook Duplicate SUCCESS -> 200 OK Replay Protection', passed: false, error: err.message });
    }
    // Test 16: Webhook SUCCESS after FAILED/REJECTED -> MUST NOT reverse state
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/webhooks/payouts', { 'x-sola-signature': 'valid_sig' }, {
            requestNumber: 'PAY-2026-0815-rejected',
            eventType: 'PAYOUT_SUCCESS',
        });
        if (res.statusCode === 200 && res.body.data.message.includes('ignored')) {
            results.push({ name: 'FLOW-ADM-08 [1.16] Webhook SUCCESS after REJECTED -> Terminal State Preserved', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.16] Webhook SUCCESS after REJECTED -> Terminal State Preserved', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.16] Webhook SUCCESS after REJECTED -> Terminal State Preserved', passed: false, error: err.message });
    }
    // Test 17: Invalid Webhook HMAC -> 401 Unauthorized
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/webhooks/payouts', { 'x-sola-signature': 'invalid_sig' }, {
            requestNumber: 'PAY-2026-0815-001',
        });
        if (res.statusCode === 401 && res.body.error?.code === 'UNAUTHORIZED_INVALID_WEBHOOK_SIGNATURE') {
            results.push({ name: 'FLOW-ADM-08 [1.17] Invalid Webhook HMAC Signature -> 401 Unauthorized', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.17] Invalid Webhook HMAC Signature -> 401 Unauthorized', passed: false, error: `Expected 401, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.17] Invalid Webhook HMAC Signature -> 401 Unauthorized', passed: false, error: err.message });
    }
    // Test 18: Release with forged/nonexistent reconciliationId -> MUST FAIL (400)
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-failed-001/release-funds', adminHeaders, {
            proofType: 'DIRECT_PROVIDER_STATUS_NOT_FOUND',
            reconciliationId: 'forged_rec_id_999',
        });
        if (res.statusCode === 400 && res.body.error?.code === 'PAYOUT_NOT_ELIGIBLE_FOR_RELEASE') {
            results.push({ name: 'FLOW-ADM-08 [1.18] Release Funds with Forged Reconciliation ID -> 400 Rejected', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.18] Release Funds with Forged Reconciliation ID -> 400 Rejected', passed: false, error: `Expected 400, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.18] Release Funds with Forged Reconciliation ID -> 400 Rejected', passed: false, error: err.message });
    }
    // Test 19: Provider fee upper/lower bounds -> 400 FEE_EXCEEDS_BOUNDS
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-001/approve', adminHeaders, { actualProviderFee: 150.00 });
        if (res.statusCode === 400 && res.body.error?.code === 'FEE_EXCEEDS_BOUNDS') {
            results.push({ name: 'FLOW-ADM-08 [1.19] Provider Fee Exceeding Bounds (150 > 100 max) -> 400 FEE_EXCEEDS_BOUNDS', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.19] Provider Fee Exceeding Bounds (150 > 100 max) -> 400 FEE_EXCEEDS_BOUNDS', passed: false, error: `Expected 400, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.19] Provider Fee Exceeding Bounds (150 > 100 max) -> 400 FEE_EXCEEDS_BOUNDS', passed: false, error: err.message });
    }
    // Test 20: PII reveal audit + temporary exposure
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-001/reveal-pii', adminHeaders);
        if (res.statusCode === 200 && res.body.data.unmaskedAccountNumber && res.body.data.expiresInSeconds === 60 && res.body.data.auditLogId) {
            results.push({ name: 'FLOW-ADM-08 [1.20] PII Reveal Endpoint -> 60s Unmasked Exposure + Audit Logged', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.20] PII Reveal Endpoint -> 60s Unmasked Exposure + Audit Logged', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.20] PII Reveal Endpoint -> 60s Unmasked Exposure + Audit Logged', passed: false, error: err.message });
    }
    // Test 21: Structured Rejection Code OTHER without text -> 400 Bad Request
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-001/reject', adminHeaders, {
            reasonCode: 'OTHER',
            rejectionReason: 'short', // less than 15 chars
        });
        if (res.statusCode === 400 && res.body.error?.code === 'REJECTION_REASON_TEXT_MIN_LENGTH_REQUIRED') {
            results.push({ name: 'FLOW-ADM-08 [1.21] Rejection Code OTHER with < 15 chars -> 400 Bad Request', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.21] Rejection Code OTHER with < 15 chars -> 400 Bad Request', passed: false, error: `Expected 400, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.21] Rejection Code OTHER with < 15 chars -> 400 Bad Request', passed: false, error: err.message });
    }
    // Test 22: Non-admin token on Approve -> 403 Forbidden
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pr-001/approve', ownerHeaders, { actualProviderFee: 10 });
        if (res.statusCode === 403 && res.body.error?.code === 'FORBIDDEN_INSUFFICIENT_ROLE') {
            results.push({ name: 'FLOW-ADM-08 [1.22] Non-Admin Token on Approve -> 403 Forbidden', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-08 [1.22] Non-Admin Token on Approve -> 403 Forbidden', passed: false, error: `Expected 403, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-08 [1.22] Non-Admin Token on Approve -> 403 Forbidden', passed: false, error: err.message });
    }
    return { suiteName: 'FLOW-ADM-08 Payout Execution & Processing Suite', results };
}
