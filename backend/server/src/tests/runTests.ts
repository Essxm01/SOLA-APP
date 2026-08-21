/**
 * Master Test Runner Executable for Sola Server Security, Financial Invariants, HTTP Runtime & Real PostgreSQL Runtime Suites
 * Location: server/src/tests/runTests.ts
 */

import { runAuthSecuritySuite } from './authSecurity.test';
import { runFinancialDomainSuite } from './financialDomain.test';
import { runHttpRuntimeSuite } from './httpRuntime.test';
import { runComprehensiveSecuritySuite } from './comprehensiveSecurity.test';
import { runExitAuditSuite } from './exitAudit.test';
import { runPostgresRuntimeSuite } from './postgresRuntime.test';
import { runAdminFoundationSuite } from './adminFoundation.test';
import { runCustomerFoundationSuite } from './customerFoundation.test';
import { runMultiPartyIntegrationSuite } from './multiPartyIntegration.test';
import { runCustomerMessagingDisputesSuite } from './customerMessagingDisputes.test';
import { runPayoutQueueSuite } from './payoutQueue.test';
import { runPayoutExecutionSuite } from './payoutExecution.test';
import { runDisputesExecutionSuite } from './disputesExecution.test';
import { runCorsPolicySuite } from './corsPolicy.test';
import { runPropertyMediaStorageSuite } from './propertyMediaStorage.test';
import { runCustomerPropertyDecisionSuite } from './customerPropertyDecision.test';
import { runSharedIdentityResolutionSuite } from './sharedIdentityResolution.test.js';
import { runAuth02b2ReliabilitySuite } from './auth02b2Reliability.test.js';
import { runAuth03Tests } from './auth03CustomerProfile.test.js';

async function main() {
  console.log('======================================================================');
  console.log('       SOLA VACATION RENTALS — MASTER PHASE 7 FINAL EXIT AUDIT HARNESS');
  console.log('======================================================================');

  // Suite 1: Auth & Security Suite
  console.log('\n[SUITE 1] AUTH & SECURITY RED-TEAM SUITE:');
  const authSummary = await runAuthSecuritySuite();
  authSummary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [1.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 2: Financial Engine & Domain Controllers Suite
  console.log('\n[SUITE 2] FINANCIAL ENGINE & DOMAIN CONTROLLERS SUITE:');
  const finSummary = await runFinancialDomainSuite();
  finSummary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [2.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 3: Real HTTP Socket Runtime Suite
  console.log('\n[SUITE 3] REAL HTTP SOCKET RUNTIME & NETWORK SUITE:');
  const httpSummary = await runHttpRuntimeSuite();
  httpSummary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [3.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 4: Comprehensive Red-Team & Precision Invariants
  console.log('\n[SUITE 4] COMPREHENSIVE RED-TEAM & PRECISION INVARIANTS SUITE:');
  const compSummary = await runComprehensiveSecuritySuite();
  compSummary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [4.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 5: Exit Audit Test Suite
  console.log('\n[SUITE 5] FINAL EXIT AUDIT: CONCURRENCY, SNAPSHOT, TIMING & FORBIDDEN TRANSITIONS:');
  const exitSummary = await runExitAuditSuite();
  exitSummary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [5.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 6: Real PostgreSQL Engine Runtime Suite
  console.log('\n[SUITE 6] REAL POSTGRESQL ENGINE RUNTIME & CONCURRENCY SUITE:');
  const pgSummary = await runPostgresRuntimeSuite();
  pgSummary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [6.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 7: Administrative Foundation Suite
  console.log('\n[SUITE 7] MINIMAL ADMINISTRATIVE FOUNDATION SUITE:');
  const adminSummary = await runAdminFoundationSuite();
  adminSummary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [7.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 8: Customer Foundation Suite (Phase C1)
  console.log('\n[SUITE 8] CUSTOMER FOUNDATION SUITE (PHASE C1):');
  const custSummary = await runCustomerFoundationSuite();
  custSummary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [8.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 9: Multi-Party Booking Lifecycle Suite (Phase C3)
  console.log('\n[SUITE 9] MULTI-PARTY BOOKING LIFECYCLE SUITE (PHASE C3):');
  const multiSummary = await runMultiPartyIntegrationSuite();
  multiSummary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [9.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 10: Customer Messaging, Disputes & Red-Team Suite (Phase C4)
  console.log('\n[SUITE 10] CUSTOMER MESSAGING, DISPUTES & RED-TEAM SUITE (PHASE C4):');
  const msgDispSummary = await runCustomerMessagingDisputesSuite();
  msgDispSummary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [10.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 11: FLOW-ADM-07 Payout Requests Queue Suite
  console.log('\n[SUITE 11] FLOW-ADM-07 PAYOUT REQUESTS QUEUE SUITE:');
  const payoutQueueRaw = await runPayoutQueueSuite();
  const payoutQueueSummary = {
    total: payoutQueueRaw.results.length,
    passed: payoutQueueRaw.results.filter(r => r.passed).length,
    failed: payoutQueueRaw.results.filter(r => !r.passed).length,
  };
  payoutQueueRaw.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [11.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 12: FLOW-ADM-08 Payout Execution & Processing Suite
  console.log('\n[SUITE 12] FLOW-ADM-08 PAYOUT EXECUTION & PROCESSING SUITE:');
  const payoutExecRaw = await runPayoutExecutionSuite();
  const payoutExecSummary = {
    total: payoutExecRaw.results.length,
    passed: payoutExecRaw.results.filter(r => r.passed).length,
    failed: payoutExecRaw.results.filter(r => !r.passed).length,
  };
  payoutExecRaw.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [12.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 13: FLOW-ADM-09 Disputes Queue, Governance & Refund Saga Suite
  console.log('\n[SUITE 13] FLOW-ADM-09 DISPUTES QUEUE, GOVERNANCE & REFUND SAGA SUITE:');
  const disputesExecRaw = await runDisputesExecutionSuite();
  const disputesExecSummary = {
    total: disputesExecRaw.results.length,
    passed: disputesExecRaw.results.filter(r => r.passed).length,
    failed: disputesExecRaw.results.filter(r => !r.passed).length,
  };
  disputesExecRaw.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [13.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 14: CORS Policy Security & Whitelist Suite
  console.log('\n[SUITE 14] CORS POLICY SECURITY & WHITELIST SUITE:');
  const corsSummary = await runCorsPolicySuite();
  corsSummary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [14.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 15: External Object Storage & Property Image Persistence Suite (TASK 1E)
  console.log('\n[SUITE 15] EXTERNAL OBJECT STORAGE & PROPERTY IMAGE PERSISTENCE SUITE (TASK 1E):');
  const mediaSummary = await runPropertyMediaStorageSuite();
  mediaSummary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [15.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 16: Customer Property Decision Cluster Suite
  console.log('\n[SUITE 16] CUSTOMER PROPERTY DECISION CLUSTER & PRICING SUITE:');
  const custDecisionSummary = await runCustomerPropertyDecisionSuite();
  custDecisionSummary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [16.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 17: AUTH-02B1 Shared Identity Resolution Suite
  console.log('\n[SUITE 17] AUTH-02B1: SHARED IDENTITY RESOLUTION & ROLE ISSUANCE SUITE:');
  const sharedIdentitySummary = await runSharedIdentityResolutionSuite();
  sharedIdentitySummary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [17.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 18: AUTH-02B2 Authentication Runtime Reliability Suite
  console.log('\n[SUITE 18] AUTH-02B2: AUTHENTICATION RUNTIME RELIABILITY & SESSION RECOVERY SUITE:');
  const auth02b2Summary = await runAuth02b2ReliabilitySuite();
  auth02b2Summary.results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [18.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  // Suite 19: AUTH-03 Renter Real Account & Profile UX Suite
  console.log('\n[SUITE 19] AUTH-03: RENTER REAL ACCOUNT & PROFILE UX SUITE:');
  const auth03Results = await runAuth03Tests();
  const auth03Summary = {
    total: auth03Results.length,
    passed: auth03Results.filter(r => r.passed).length,
    failed: auth03Results.filter(r => !r.passed).length,
  };
  auth03Results.forEach((r, idx) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  [19.${idx + 1}] ${status} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
  });

  const total = authSummary.total + finSummary.total + httpSummary.total + compSummary.total + exitSummary.total + pgSummary.total + adminSummary.total + custSummary.total + multiSummary.total + msgDispSummary.total + payoutQueueSummary.total + payoutExecSummary.total + disputesExecSummary.total + corsSummary.total + mediaSummary.total + custDecisionSummary.total + sharedIdentitySummary.total + auth02b2Summary.total + auth03Summary.total;
  const passed = authSummary.passed + finSummary.passed + httpSummary.passed + compSummary.passed + exitSummary.passed + pgSummary.passed + adminSummary.passed + custSummary.passed + multiSummary.passed + msgDispSummary.passed + payoutQueueSummary.passed + payoutExecSummary.passed + disputesExecSummary.passed + corsSummary.passed + mediaSummary.passed + custDecisionSummary.passed + sharedIdentitySummary.passed + auth02b2Summary.passed + auth03Summary.passed;
  const failed = authSummary.failed + finSummary.failed + httpSummary.failed + compSummary.failed + exitSummary.failed + pgSummary.failed + adminSummary.failed + custSummary.failed + multiSummary.failed + msgDispSummary.failed + payoutQueueSummary.failed + payoutExecSummary.failed + disputesExecSummary.failed + corsSummary.failed + mediaSummary.failed + custDecisionSummary.failed + sharedIdentitySummary.failed + auth02b2Summary.failed + auth03Summary.failed;



  console.log('\n======================================================================');
  console.log(`MASTER HARNESS TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
