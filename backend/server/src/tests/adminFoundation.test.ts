/**
 * Sola Vacation Rentals — Master Administrative Foundation Test Suite
 * Location: server/src/tests/adminFoundation.test.ts
 */

import { ExpressServerApp } from '../app';
import { AdminDomainController } from '../controllers/domainControllers';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runAdminFoundationSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];
  const app = new ExpressServerApp();

  const ownerToken = 'owner_token_valid';
  const adminToken = 'admin_token_valid';

  const ownerHeaders = { authorization: `Bearer ${ownerToken}` };
  const adminHeaders = { authorization: `Bearer ${adminToken}` };

  // =========================================================================
  // 1. AUTHORIZATION TESTS (1-3)
  // =========================================================================

  // Test 1: ROLE_OWNER -> 403 on all four endpoints
  try {
    const endpoints = [
      '/api/v1/admin/owners/o1/documents/d1/review',
      '/api/v1/admin/properties/p1/review',
      '/api/v1/admin/payouts/pay1/process',
      '/api/v1/admin/disputes/disp1/resolve',
    ];
    let allForbidden = true;
    for (const ep of endpoints) {
      const res = await app.handleHttpRequest('POST', ep, ownerHeaders, {});
      if (res.statusCode !== 403) allForbidden = false;
    }
    results.push({ name: 'Admin Auth 1: ROLE_OWNER -> 403 Forbidden on all admin endpoints', passed: allForbidden });
  } catch (err: any) {
    results.push({ name: 'Admin Auth 1: ROLE_OWNER -> 403 Forbidden on all admin endpoints', passed: false, error: err.message });
  }

  // Test 2: Invalid / missing token -> rejected with 401
  try {
    const res1 = await app.handleHttpRequest('POST', '/api/v1/admin/properties/p1/review', {}, {});
    const res2 = await app.handleHttpRequest('POST', '/api/v1/admin/properties/p1/review', { authorization: 'Bearer invalid_token' }, {});
    results.push({ name: 'Admin Auth 2: Missing or invalid token rejected with 401 Unauthorized', passed: res1.statusCode === 401 && res2.statusCode === 401 });
  } catch (err: any) {
    results.push({ name: 'Admin Auth 2: Missing or invalid token rejected with 401 Unauthorized', passed: false, error: err.message });
  }

  // Test 3: ROLE_ADMIN -> allowed with 200
  try {
    const res = await app.handleHttpRequest('POST', '/api/v1/admin/properties/p1/review', adminHeaders, { decision: 'PUBLISHED' });
    const isOk = res.statusCode === 200 && res.body.success === true;
    results.push({ name: 'Admin Auth 3: ROLE_ADMIN -> 200 OK access allowed', passed: isOk, error: isOk ? undefined : `Got ${res.statusCode}: ${JSON.stringify(res.body)}` });
  } catch (err: any) {
    results.push({ name: 'Admin Auth 3: ROLE_ADMIN -> 200 OK access allowed', passed: false, error: err.message });
  }

  // =========================================================================
  // 2. OWNER DOCUMENT TESTS (4-8)
  // =========================================================================

  // Test 4: APPROVED transition
  try {
    const res = AdminDomainController.reviewOwnerDocument({ id: 'd1', status: 'PENDING' }, 'APPROVED', 'Valid ID');
    results.push({ name: 'Admin Document 1: PENDING -> APPROVED document verification transition', passed: res.documentStatus === 'VERIFIED' && res.ownerVerificationStatus === 'VERIFIED' });
  } catch (err: any) {
    results.push({ name: 'Admin Document 1: PENDING -> APPROVED document verification transition', passed: false, error: err.message });
  }

  // Test 5: REJECTED transition
  try {
    const res = AdminDomainController.reviewOwnerDocument({ id: 'd1', status: 'PENDING' }, 'REJECTED', 'Blurry ID');
    results.push({ name: 'Admin Document 2: PENDING -> REJECTED document verification transition', passed: res.documentStatus === 'REJECTED' && res.reason === 'Blurry ID' });
  } catch (err: any) {
    results.push({ name: 'Admin Document 2: PENDING -> REJECTED document verification transition', passed: false, error: err.message });
  }

  // Test 6: Invalid decision parameter rejection over HTTP
  try {
    const res = await app.handleHttpRequest('POST', '/api/v1/admin/owners/o1/documents/d1/review', adminHeaders, { decision: 'INVALID' });
    results.push({ name: 'Admin Document 3: Invalid decision parameter rejection', passed: res.statusCode === 400 });
  } catch (err: any) {
    results.push({ name: 'Admin Document 3: Invalid decision parameter rejection', passed: false, error: err.message });
  }

  // Test 7: Invalid current state rejection (already verified doc)
  try {
    AdminDomainController.reviewOwnerDocument({ id: 'd1', status: 'VERIFIED' }, 'APPROVED');
    results.push({ name: 'Admin Document 4: Non-pending document review rejection', passed: false, error: 'Should have thrown' });
  } catch (err: any) {
    results.push({ name: 'Admin Document 4: Non-pending document review rejection', passed: err.message === 'INVALID_STATE_TRANSITION_DOC_NOT_PENDING' });
  }

  // Test 8: Audit log created for document review
  try {
    const res = await app.handleHttpRequest('POST', '/api/v1/admin/owners/o1/documents/d1/review', adminHeaders, { decision: 'APPROVED', reason: 'Clear copy' });
    const hasAudit = res.statusCode === 200 && res.body && res.body.data && res.body.data.auditLog && res.body.data.auditLog.entityType === 'OWNER_DOCUMENT';
    results.push({ name: 'Admin Document 5: Audit log creation for document review', passed: hasAudit, error: hasAudit ? undefined : `Got ${res.statusCode}: ${JSON.stringify(res.body)}` });
  } catch (err: any) {
    results.push({ name: 'Admin Document 5: Audit log creation for document review', passed: false, error: err.message });
  }

  // =========================================================================
  // 3. PROPERTY REVIEW TESTS (9-12)
  // =========================================================================

  // Test 9: PENDING_REVIEW -> PUBLISHED
  try {
    const mockProp: any = { status: 'PENDING_REVIEW', verificationStatus: 'UNVERIFIED' };
    const updated = AdminDomainController.reviewProperty(mockProp, 'PUBLISHED', 'All good');
    results.push({ name: 'Admin Property 1: PENDING_REVIEW -> PUBLISHED property transition', passed: updated.status === 'PUBLISHED' && updated.verificationStatus === 'VERIFIED' });
  } catch (err: any) {
    results.push({ name: 'Admin Property 1: PENDING_REVIEW -> PUBLISHED property transition', passed: false, error: err.message });
  }

  // Test 10: PENDING_REVIEW -> REJECTED (Reverts to DRAFT with REJECTED verification status)
  try {
    const mockProp: any = { status: 'PENDING_REVIEW', verificationStatus: 'UNVERIFIED' };
    const updated = AdminDomainController.reviewProperty(mockProp, 'REJECTED', 'Missing photos');
    results.push({ name: 'Admin Property 2: PENDING_REVIEW -> REJECTED revert to DRAFT with notes', passed: updated.status === 'DRAFT' && updated.verificationStatus === 'REJECTED' });
  } catch (err: any) {
    results.push({ name: 'Admin Property 2: PENDING_REVIEW -> REJECTED revert to DRAFT with notes', passed: false, error: err.message });
  }

  // Test 11: Invalid current state rejection (DRAFT property review)
  try {
    const mockProp: any = { status: 'DRAFT' };
    AdminDomainController.reviewProperty(mockProp, 'PUBLISHED');
    results.push({ name: 'Admin Property 3: Non-PENDING_REVIEW property review rejection', passed: false, error: 'Should have thrown' });
  } catch (err: any) {
    results.push({ name: 'Admin Property 3: Non-PENDING_REVIEW property review rejection', passed: err.message === 'INVALID_STATE_TRANSITION_PROP_NOT_PENDING_REVIEW' });
  }

  // Test 12: Audit log created for property review
  try {
    const res = await app.handleHttpRequest('POST', '/api/v1/admin/properties/p100/review', adminHeaders, { decision: 'PUBLISHED', reviewNotes: 'Approved' });
    const hasAudit = res.body.data && res.body.data.auditLog && res.body.data.auditLog.entityType === 'PROPERTY';
    results.push({ name: 'Admin Property 4: Audit log creation for property review', passed: hasAudit });
  } catch (err: any) {
    results.push({ name: 'Admin Property 4: Audit log creation for property review', passed: false, error: err.message });
  }

  // =========================================================================
  // 4. PAYOUT PROCESSING TESTS (13-19)
  // =========================================================================

  // Test 13: COMPLETED accounting payload
  try {
    const res = AdminDomainController.processPayout({ id: 'pay1', status: 'PENDING_ADMIN_PROCESSING', grossAmount: 1000, ownerId: 'o1' }, 'COMPLETED', 'TX_12345');
    results.push({ name: 'Admin Payout 1: PENDING -> COMPLETED payout processing with txId', passed: res.status === 'COMPLETED' && res.providerTxId === 'TX_12345' });
  } catch (err: any) {
    results.push({ name: 'Admin Payout 1: PENDING -> COMPLETED payout processing with txId', passed: false, error: err.message });
  }

  // Test 14: REJECTED accounting payload
  try {
    const res = AdminDomainController.processPayout({ id: 'pay1', status: 'PENDING_ADMIN_PROCESSING', grossAmount: 1000, ownerId: 'o1' }, 'REJECTED', undefined, 'Invalid IBAN');
    results.push({ name: 'Admin Payout 2: PENDING -> REJECTED payout processing with reason', passed: res.status === 'REJECTED' && res.rejectionReason === 'Invalid IBAN' });
  } catch (err: any) {
    results.push({ name: 'Admin Payout 2: PENDING -> REJECTED payout processing with reason', passed: false, error: err.message });
  }

  // Test 15: Duplicate processing rejection (already COMPLETED)
  try {
    AdminDomainController.processPayout({ id: 'pay1', status: 'COMPLETED', grossAmount: 1000, ownerId: 'o1' }, 'COMPLETED', 'TX_99');
    results.push({ name: 'Admin Payout 3: Duplicate processing on COMPLETED payout rejection', passed: false, error: 'Should have thrown' });
  } catch (err: any) {
    results.push({ name: 'Admin Payout 3: Duplicate processing on COMPLETED payout rejection', passed: err.message === 'PAYOUT_ALREADY_PROCESSED' });
  }

  // Test 16: Invalid providerTxId rejected for COMPLETED action
  try {
    AdminDomainController.processPayout({ id: 'pay1', status: 'PENDING_ADMIN_PROCESSING', grossAmount: 1000, ownerId: 'o1' }, 'COMPLETED', '');
    results.push({ name: 'Admin Payout 4: Missing providerTxId for COMPLETED action rejection', passed: false, error: 'Should have thrown' });
  } catch (err: any) {
    results.push({ name: 'Admin Payout 4: Missing providerTxId for COMPLETED action rejection', passed: err.message === 'PROVIDER_TX_ID_REQUIRED_FOR_COMPLETED_PAYOUT' });
  }

  // Test 17: Rejection without rejectionReason rejected
  try {
    AdminDomainController.processPayout({ id: 'pay1', status: 'PENDING_ADMIN_PROCESSING', grossAmount: 1000, ownerId: 'o1' }, 'REJECTED', undefined, '');
    results.push({ name: 'Admin Payout 5: Missing rejectionReason for REJECTED action rejection', passed: false, error: 'Should have thrown' });
  } catch (err: any) {
    results.push({ name: 'Admin Payout 5: Missing rejectionReason for REJECTED action rejection', passed: err.message === 'REJECTION_REASON_REQUIRED_FOR_REJECTED_PAYOUT' });
  }

  // Test 18: Atomic validation invariant (gross amount unchanged)
  try {
    const payoutObj = { id: 'pay1', status: 'PENDING_ADMIN_PROCESSING', grossAmount: 1500, ownerId: 'o1' };
    const res = AdminDomainController.processPayout(payoutObj, 'COMPLETED', 'TX_555');
    results.push({ name: 'Admin Payout 6: Payout gross amount immutability invariant', passed: payoutObj.grossAmount === 1500 && res.status === 'COMPLETED' });
  } catch (err: any) {
    results.push({ name: 'Admin Payout 6: Payout gross amount immutability invariant', passed: false, error: err.message });
  }

  // Test 19: Audit log created for payout processing
  try {
    const res = await app.handleHttpRequest('POST', '/api/v1/admin/payouts/pay100/process', adminHeaders, { action: 'COMPLETED', providerTxId: 'TX_111' });
    const hasAudit = res.body.data && res.body.data.auditLog && res.body.data.auditLog.entityType === 'PAYOUT_REQUEST';
    results.push({ name: 'Admin Payout 7: Audit log creation for payout processing', passed: hasAudit });
  } catch (err: any) {
    results.push({ name: 'Admin Payout 7: Audit log creation for payout processing', passed: false, error: err.message });
  }

  // =========================================================================
  // 5. DISPUTE RESOLUTION TESTS (20-24)
  // =========================================================================

  // Test 20: Valid resolution (RELEASE_TO_OWNER -> NO_FINANCIAL_ACTION)
  try {
    const mockDispute: any = { id: 'disp1', status: 'ESCALATED_TO_ADMIN' };
    const res = AdminDomainController.resolveDispute(mockDispute, 'RELEASE_TO_OWNER', undefined, 'المعاينة الفنية تثبت سلامة الوحدة وعدم التلفيات المزعومة');
    results.push({ name: 'Admin Dispute 1: Valid dispute resolution transition to RESOLVED', passed: res.status === 'RESOLVED' && res.resolutionType === 'NO_FINANCIAL_ACTION' });
  } catch (err: any) {
    results.push({ name: 'Admin Dispute 1: Valid dispute resolution transition to RESOLVED', passed: false, error: err.message });
  }

  // Test 21: Invalid current state rejection (already RESOLVED dispute)
  try {
    const mockDispute: any = { id: 'disp1', status: 'RESOLVED' };
    AdminDomainController.resolveDispute(mockDispute, 'RELEASE_TO_OWNER', undefined, 'المعاينة الفنية تثبت سلامة الوحدة وعدم التلفيات المزعومة');
    results.push({ name: 'Admin Dispute 2: Already RESOLVED dispute resolution rejection', passed: false, error: 'Should have thrown' });
  } catch (err: any) {
    results.push({ name: 'Admin Dispute 2: Already RESOLVED dispute resolution rejection', passed: err.message === 'DISPUTE_ALREADY_RESOLVED' });
  }

  // Test 22: Invalid refund amount rejected for SPLIT resolution
  try {
    const mockDispute: any = { id: 'disp1', status: 'ESCALATED_TO_ADMIN' };
    AdminDomainController.resolveDispute(mockDispute, 'SPLIT', 0, 'المعاينة الفنية تثبت سلامة الوحدة وعدم التلفيات المزعومة');
    results.push({ name: 'Admin Dispute 3: Zero or negative refund amount for SPLIT resolution rejection', passed: false, error: 'Should have thrown' });
  } catch (err: any) {
    results.push({ name: 'Admin Dispute 3: Zero or negative refund amount for SPLIT resolution rejection', passed: err.message === 'REFUND_AMOUNT_REQUIRED_FOR_SPLIT_RESOLUTION' });
  }

  // Test 23: Correct existing internal resolution mapping
  try {
    const mockDispute: any = { id: 'disp1', status: 'ESCALATED_TO_ADMIN' };
    const res1 = AdminDomainController.resolveDispute(mockDispute, 'REFUND_GUEST', 500, 'المعاينة الفنية تثبت سلامة الوحدة وعدم التلفيات المزعومة');
    const res2 = AdminDomainController.resolveDispute(mockDispute, 'SPLIT', 250, 'المعاينة الفنية تثبت سلامة الوحدة وعدم التلفيات المزعومة');
    results.push({ name: 'Admin Dispute 4: Correct internal resolution type mapping', passed: res1.resolutionType === 'FULL_REFUND' && res2.resolutionType === 'PARTIAL_REFUND' });
  } catch (err: any) {
    results.push({ name: 'Admin Dispute 4: Correct internal resolution type mapping', passed: false, error: err.message });
  }

  // Test 24: Audit log created for dispute resolution
  try {
    const res = await app.handleHttpRequest('POST', '/api/v1/admin/disputes/disp100/resolve', adminHeaders, { resolutionType: 'RELEASE_TO_OWNER', adminNotes: 'المعاينة الفنية تثبت سلامة الوحدة وعدم التلفيات المزعومة' });
    const hasAudit = res.body.data && res.body.data.auditLog && res.body.data.auditLog.entityType === 'DISPUTE';
    results.push({ name: 'Admin Dispute 5: Audit log creation for dispute resolution', passed: hasAudit });
  } catch (err: any) {
    results.push({ name: 'Admin Dispute 5: Audit log creation for dispute resolution', passed: false, error: err.message });
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return { total: results.length, passed, failed, results };
}
