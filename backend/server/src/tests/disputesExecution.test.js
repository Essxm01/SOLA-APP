/**
 * Master Automated Test Suite for FLOW-ADM-09: Disputes Queue, Governance & Refund Saga
 * Location: server/src/tests/disputesExecution.test.ts
 */
import { ExpressServerApp } from '../app';
export async function runDisputesExecutionSuite() {
    const results = [];
    const app = new ExpressServerApp();
    const adminToken = 'admin_token_valid';
    const ownerToken = 'owner_token_valid';
    const customerToken = 'customer_token_valid';
    const adminHeaders = { authorization: `Bearer ${adminToken}` };
    const ownerHeaders = { authorization: `Bearer ${ownerToken}` };
    const customerHeaders = { authorization: `Bearer ${customerToken}` };
    // Test 1: RELEASE_TO_OWNER
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/disputes/dsp-001/resolve', adminHeaders, {
            resolutionType: 'RELEASE_TO_OWNER',
            adminNotes: 'تم فحص الأدلة وتأكيد صلاحية الوحدة وموقف المالك المعتمد',
        });
        if (res.statusCode === 200 && res.body.success && res.body.data.status === 'RESOLVED' && res.body.data.ownerReleasedAmountEgp === 5000) {
            results.push({ name: 'FLOW-ADM-09 [1.1] RELEASE_TO_OWNER -> 200 OK + RESOLVED + 100% Owner Release', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.1] RELEASE_TO_OWNER -> 200 OK + RESOLVED + 100% Owner Release', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.1] RELEASE_TO_OWNER -> 200 OK + RESOLVED + 100% Owner Release', passed: false, error: err.message });
    }
    // Test 2: REFUND_GUEST
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/disputes/dsp-002/resolve', adminHeaders, {
            resolutionType: 'REFUND_GUEST',
            adminNotes: 'ثبوت مخالفة المواصفات الفنية وتضرر المستأجر بالكامل',
        });
        if (res.statusCode === 200 && res.body.success && res.body.data.status === 'RESOLVING_PENDING_GATEWAY' && res.body.data.guestRefundAmountEgp === 5000) {
            results.push({ name: 'FLOW-ADM-09 [1.2] REFUND_GUEST -> 200 OK + RESOLVING_PENDING_GATEWAY + 100% Guest Refund Saga', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.2] REFUND_GUEST -> 200 OK + RESOLVING_PENDING_GATEWAY + 100% Guest Refund Saga', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.2] REFUND_GUEST -> 200 OK + RESOLVING_PENDING_GATEWAY + 100% Guest Refund Saga', passed: false, error: err.message });
    }
    // Test 3: SPLIT
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/disputes/dsp-003/resolve', adminHeaders, {
            resolutionType: 'SPLIT',
            refundAmount: 2000.00,
            adminNotes: 'تقسيم المبلغ المحجوز: 3000 للمالك و 2000 استرداد للضيف',
        });
        if (res.statusCode === 200 && res.body.success && res.body.data.ownerReleasedAmountEgp === 3000 && res.body.data.guestRefundAmountEgp === 2000) {
            results.push({ name: 'FLOW-ADM-09 [1.3] SPLIT -> 200 OK + Owner Release 3000 + Guest Refund Saga 2000', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.3] SPLIT -> 200 OK + Owner Release 3000 + Guest Refund Saga 2000', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.3] SPLIT -> 200 OK + Owner Release 3000 + Guest Refund Saga 2000', passed: false, error: err.message });
    }
    // Test 4: Split + successful refund webhook
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/webhooks/disputes', { 'x-sola-signature': 'valid_sig' }, {
            disputeId: 'dsp-003',
            eventType: 'REFUND_SUCCESS',
            providerRefundId: 'RFD_TX_8877',
        });
        if (res.statusCode === 200 && res.body.success && res.body.data.disputeStatus === 'RESOLVED') {
            results.push({ name: 'FLOW-ADM-09 [1.4] Split + Successful Refund Webhook -> Dispute RESOLVED', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.4] Split + Successful Refund Webhook -> Dispute RESOLVED', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.4] Split + Successful Refund Webhook -> Dispute RESOLVED', passed: false, error: err.message });
    }
    // Test 5: Split + failed refund reconcile
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/disputes/dsp-not_found/reconcile', adminHeaders);
        if (res.statusCode === 200 && res.body.data.updatedDisputeStatus === 'ESCALATED_TO_ADMIN' && res.body.data.updatedSagaStatus === 'FAILED') {
            results.push({ name: 'FLOW-ADM-09 [1.5] Split + Failed Refund Reconcile -> ESCALATED_TO_ADMIN (Re-eval Unlocked)', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.5] Split + Failed Refund Reconcile -> ESCALATED_TO_ADMIN (Re-eval Unlocked)', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.5] Split + Failed Refund Reconcile -> ESCALATED_TO_ADMIN (Re-eval Unlocked)', passed: false, error: err.message });
    }
    // Test 6: Split + re-evaluation
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/disputes/dsp-split_failed/resolve', adminHeaders, {
            resolutionType: 'REFUND_GUEST',
            adminNotes: 'إعادة تقييم النزاع بعد فشل الاسترداد السابق واسترداد باقي المحتجز',
        });
        if (res.statusCode === 200 && res.body.data.guestRefundAmountEgp === 2000.00) {
            results.push({ name: 'FLOW-ADM-09 [1.6] Split + Re-Evaluation -> Refund Capped at Remaining Held (2000 EGP)', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.6] Split + Re-Evaluation -> Refund Capped at Remaining Held (2000 EGP)', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.6] Split + Re-Evaluation -> Refund Capped at Remaining Held (2000 EGP)', passed: false, error: err.message });
    }
    // Test 7: Over-refund attack (X >= H_remaining)
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/disputes/dsp-001/resolve', adminHeaders, {
            resolutionType: 'SPLIT',
            refundAmount: 6000.00, // Frozen hold is 5000
            adminNotes: 'محاولة استرداد مبلغ أكبر من المبلغ المحتجز الإجمالي بالتحفظ',
        });
        if (res.statusCode === 400 && res.body.error?.code === 'REFUND_AMOUNT_EXCEEDS_REMAINING_HELD_BALANCE') {
            results.push({ name: 'FLOW-ADM-09 [1.7] Over-Refund Attack (6000 > 5000 hold) -> 400 Rejected', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.7] Over-Refund Attack (6000 > 5000 hold) -> 400 Rejected', passed: false, error: `Expected 400, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.7] Over-Refund Attack (6000 > 5000 hold) -> 400 Rejected', passed: false, error: err.message });
    }
    // Test 8: Double resolve (400 DISPUTE_ALREADY_RESOLVED)
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/disputes/dsp-resolved-001/resolve', adminHeaders, {
            resolutionType: 'RELEASE_TO_OWNER',
            adminNotes: 'محاولة بت ثانية على نزاع محسوم سابقاً بالكامل بالداتابيز',
        });
        if (res.statusCode === 400 && res.body.error?.code === 'DISPUTE_ALREADY_RESOLVED') {
            results.push({ name: 'FLOW-ADM-09 [1.8] Double Resolve on Resolved Dispute -> 400 Rejected', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.8] Double Resolve on Resolved Dispute -> 400 Rejected', passed: false, error: `Expected 400, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.8] Double Resolve on Resolved Dispute -> 400 Rejected', passed: false, error: err.message });
    }
    // Test 9: Duplicate webhook (Replay Protection)
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/webhooks/disputes', { 'x-sola-signature': 'valid_sig' }, {
            disputeId: 'dsp-resolved-001',
            eventType: 'REFUND_SUCCESS',
        });
        if (res.statusCode === 200 && res.body.data.message.includes('idempotently')) {
            results.push({ name: 'FLOW-ADM-09 [1.9] Duplicate Dispute Webhook -> 200 OK Replay Protection', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.9] Duplicate Dispute Webhook -> 200 OK Replay Protection', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.9] Duplicate Dispute Webhook -> 200 OK Replay Protection', passed: false, error: err.message });
    }
    // Test 10: UNKNOWN freeze
    try {
        const res = await app.handleHttpRequest('GET', '/api/v1/admin/disputes/dsp-still_unknown', adminHeaders);
        if (res.statusCode === 200 && res.body.data.status === 'RESOLVING_PENDING_GATEWAY') {
            results.push({ name: 'FLOW-ADM-09 [1.10] UNKNOWN Refund Saga -> Dispute Remains Locked RESOLVING_PENDING_GATEWAY', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.10] UNKNOWN Refund Saga -> Dispute Remains Locked RESOLVING_PENDING_GATEWAY', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.10] UNKNOWN Refund Saga -> Dispute Remains Locked RESOLVING_PENDING_GATEWAY', passed: false, error: err.message });
    }
    // Test 11: NOT_FOUND (Authoritative reconciliation)
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/disputes/dsp-not_found/reconcile', adminHeaders);
        if (res.statusCode === 200 && res.body.data.reconciliationResult === 'NOT_FOUND') {
            results.push({ name: 'FLOW-ADM-09 [1.11] Authoritative Reconcile NOT_FOUND -> Saga FAILED & Re-eval Unlocked', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.11] Authoritative Reconcile NOT_FOUND -> Saga FAILED & Re-eval Unlocked', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.11] Authoritative Reconcile NOT_FOUND -> Saga FAILED & Re-eval Unlocked', passed: false, error: err.message });
    }
    // Test 12: Reconcile timeout
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/disputes/dsp-still_unknown/reconcile', adminHeaders);
        if (res.statusCode === 200 && res.body.data.reconciliationResult === 'TIMEOUT' && res.body.data.updatedDisputeStatus === 'RESOLVING_PENDING_GATEWAY') {
            results.push({ name: 'FLOW-ADM-09 [1.12] Reconcile Timeout -> Remains UNKNOWN & RESOLVING_PENDING_GATEWAY', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.12] Reconcile Timeout -> Remains UNKNOWN & RESOLVING_PENDING_GATEWAY', passed: false, error: `Got status ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.12] Reconcile Timeout -> Remains UNKNOWN & RESOLVING_PENDING_GATEWAY', passed: false, error: err.message });
    }
    // Test 13: Missing/invalid adminNotes (< 20 chars)
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/disputes/dsp-001/resolve', adminHeaders, {
            resolutionType: 'RELEASE_TO_OWNER',
            adminNotes: 'قصيرة جداً', // less than 20 chars
        });
        if (res.statusCode === 400 && res.body.error?.code === 'ADMIN_NOTES_TEXT_MIN_LENGTH_REQUIRED') {
            results.push({ name: 'FLOW-ADM-09 [1.13] Missing/Invalid adminNotes (< 20 chars) -> 400 Bad Request', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.13] Missing/Invalid adminNotes (< 20 chars) -> 400 Bad Request', passed: false, error: `Expected 400, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.13] Missing/Invalid adminNotes (< 20 chars) -> 400 Bad Request', passed: false, error: err.message });
    }
    // Test 14: Invalid Webhook HMAC Signature -> 401
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/webhooks/disputes', { 'x-sola-signature': 'invalid_sig' }, {
            disputeId: 'dsp-001',
        });
        if (res.statusCode === 401 && res.body.error?.code === 'UNAUTHORIZED_INVALID_WEBHOOK_SIGNATURE') {
            results.push({ name: 'FLOW-ADM-09 [1.14] Invalid Webhook HMAC Signature -> 401 Unauthorized', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.14] Invalid Webhook HMAC Signature -> 401 Unauthorized', passed: false, error: `Expected 401, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.14] Invalid Webhook HMAC Signature -> 401 Unauthorized', passed: false, error: err.message });
    }
    // Test 15: Non-admin token on Resolve -> 403
    try {
        const res = await app.handleHttpRequest('POST', '/api/v1/admin/disputes/dsp-001/resolve', ownerHeaders, {
            resolutionType: 'RELEASE_TO_OWNER',
            adminNotes: 'محاولة مستخدم غير مسؤول إداري حسم النزاع',
        });
        if (res.statusCode === 403 && res.body.error?.code === 'FORBIDDEN_INSUFFICIENT_ROLE') {
            results.push({ name: 'FLOW-ADM-09 [1.15] Non-Admin Token on Resolve -> 403 Forbidden', passed: true });
        }
        else {
            results.push({ name: 'FLOW-ADM-09 [1.15] Non-Admin Token on Resolve -> 403 Forbidden', passed: false, error: `Expected 403, got ${res.statusCode}` });
        }
    }
    catch (err) {
        results.push({ name: 'FLOW-ADM-09 [1.15] Non-Admin Token on Resolve -> 403 Forbidden', passed: false, error: err.message });
    }
    return { suiteName: 'FLOW-ADM-09 Disputes Queue, Governance & Refund Saga Suite', results };
}
