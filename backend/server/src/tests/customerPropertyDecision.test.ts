/**
 * Sola Vacation Rentals — Customer Property Decision Cluster Test Suite
 * Location: server/src/tests/customerPropertyDecision.test.ts
 *
 * Tests the 14 Focused Rules required by Section 9:
 * 1. 1-night stay rejected (MIN_STAY_NOT_MET: الحد الأدنى للإقامة ليلتان).
 * 2. 2-night stay accepted if available.
 * 3. 30-night stay accepted if available.
 * 4. 31-night stay rejected (MAX_STAY_EXCEEDED: الحد الأقصى للإقامة 30 ليلة).
 * 5. PENDING_OWNER_APPROVAL does NOT block dates.
 * 6. APPROVED_PENDING_PAYMENT DOES block dates.
 * 7. CONFIRMED DOES block dates.
 * 8. REJECTED does not block.
 * 9. CANCELLED_BY_GUEST does not block.
 * 10. EXPIRED does not block.
 * 11. Quote follows same availability rule.
 * 12. Booking creation follows same availability rule.
 * 13. Quote still uses DB-authoritative pricing.
 * 14. Availability failures still fail closed.
 */

import { ExpressServerApp } from '../app.js';
import { CustomerDomainController } from '../controllers/domainControllers.js';
import { calculateBookingFinancials } from '../services/financialEngine.js';
import {
  GLOBAL_MIN_STAY_NIGHTS,
  GLOBAL_MAX_STAY_NIGHTS,
  BLOCKING_BOOKING_STATUSES,
  NON_BLOCKING_BOOKING_STATUSES,
  isBookingStatusBlocking,
  validateStayLength,
  hasDateRangeOverlap,
} from '../constants/bookingRules.js';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runCustomerPropertyDecisionSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];
  const app = new ExpressServerApp();

  const customerToken = 'customer_cust001_token';
  const customerHeaders = { authorization: `Bearer ${customerToken}` };

  const basePublishedProp: any = {
    id: 'prop-pub-test-01',
    ownerId: 'owner-uuid-1',
    title: 'شاليه فاخر رأس الحكمة',
    status: 'PUBLISHED',
    maxGuests: 6,
    basePricePerNight: 7500,
    pricePerNight: 7500,
  };

  // =========================================================================
  // 1. STAY LENGTH RULES (2-NIGHT MIN / 30-NIGHT MAX)
  // =========================================================================

  // Test 1: 1-night stay rejected
  try {
    let threw = false;
    try {
      CustomerDomainController.validateCustomerBookingRequest(basePublishedProp, '2026-09-01', '2026-09-02', 2);
    } catch (e: any) {
      threw = e.message.includes('MIN_STAY_NOT_MET') || e.message.includes('ليلتان');
    }
    const checkFn = validateStayLength(1);
    results.push({
      name: 'Rule 1: 1-night stay rejected (min 2 nights enforced with natural Arabic)',
      passed: threw && !checkFn.isValid && checkFn.errorCode === 'MIN_STAY_NOT_MET',
    });
  } catch (err: any) {
    results.push({ name: 'Rule 1: 1-night stay rejected', passed: false, error: err.message });
  }

  // Test 2: 2-night stay accepted if available
  try {
    const validated = CustomerDomainController.validateCustomerBookingRequest(basePublishedProp, '2026-09-01', '2026-09-03', 2);
    const checkFn = validateStayLength(2);
    results.push({
      name: 'Rule 2: 2-night stay accepted if available',
      passed: validated.nights === 2 && validated.totalBookingValue === 15000 && checkFn.isValid,
    });
  } catch (err: any) {
    results.push({ name: 'Rule 2: 2-night stay accepted', passed: false, error: err.message });
  }

  // Test 3: 30-night stay accepted if available
  try {
    const checkFn = validateStayLength(30);
    const validated = CustomerDomainController.validateCustomerBookingRequest(basePublishedProp, '2026-09-01', '2026-10-01', 2);
    results.push({
      name: 'Rule 3: 30-night stay accepted if available',
      passed: validated.nights === 30 && checkFn.isValid,
    });
  } catch (err: any) {
    results.push({ name: 'Rule 3: 30-night stay accepted', passed: false, error: err.message });
  }

  // Test 4: 31-night stay rejected
  try {
    let threw = false;
    try {
      CustomerDomainController.validateCustomerBookingRequest(basePublishedProp, '2026-09-01', '2026-10-02', 2);
    } catch (e: any) {
      threw = e.message.includes('MAX_STAY_EXCEEDED') || e.message.includes('30');
    }
    const checkFn = validateStayLength(31);
    results.push({
      name: 'Rule 4: 31-night stay rejected (max 30 nights enforced with natural Arabic)',
      passed: threw && !checkFn.isValid && checkFn.errorCode === 'MAX_STAY_EXCEEDED',
    });
  } catch (err: any) {
    results.push({ name: 'Rule 4: 31-night stay rejected', passed: false, error: err.message });
  }

  // =========================================================================
  // 2. CANONICAL AVAILABILITY BLOCKING STATUS RULES
  // =========================================================================

  // Test 5: PENDING_OWNER_APPROVAL does NOT block dates
  try {
    const isPendingBlocking = isBookingStatusBlocking('PENDING_OWNER_APPROVAL');
    const overlapWithPending = hasDateRangeOverlap('2026-09-10', '2026-09-15', [
      { checkIn: '2026-09-10', checkOut: '2026-09-15', status: 'PENDING_OWNER_APPROVAL' },
    ]);
    results.push({
      name: 'Rule 5: PENDING_OWNER_APPROVAL does NOT block dates (allows competing requests)',
      passed: !isPendingBlocking && !overlapWithPending,
    });
  } catch (err: any) {
    results.push({ name: 'Rule 5: PENDING_OWNER_APPROVAL non-blocking', passed: false, error: err.message });
  }

  // Test 6: APPROVED_PENDING_PAYMENT DOES block dates
  try {
    const isApprovedBlocking = isBookingStatusBlocking('APPROVED_PENDING_PAYMENT');
    const overlapWithApproved = hasDateRangeOverlap('2026-09-10', '2026-09-15', [
      { checkIn: '2026-09-10', checkOut: '2026-09-15', status: 'APPROVED_PENDING_PAYMENT' },
    ]);
    results.push({
      name: 'Rule 6: APPROVED_PENDING_PAYMENT DOES block dates',
      passed: isApprovedBlocking && overlapWithApproved,
    });
  } catch (err: any) {
    results.push({ name: 'Rule 6: APPROVED_PENDING_PAYMENT blocking', passed: false, error: err.message });
  }

  // Test 7: CONFIRMED DOES block dates
  try {
    const isConfirmedBlocking = isBookingStatusBlocking('CONFIRMED');
    const overlapWithConfirmed = hasDateRangeOverlap('2026-09-10', '2026-09-15', [
      { checkIn: '2026-09-10', checkOut: '2026-09-15', status: 'CONFIRMED' },
    ]);
    results.push({
      name: 'Rule 7: CONFIRMED DOES block dates',
      passed: isConfirmedBlocking && overlapWithConfirmed,
    });
  } catch (err: any) {
    results.push({ name: 'Rule 7: CONFIRMED blocking', passed: false, error: err.message });
  }

  // Test 8: REJECTED does not block
  try {
    const isRejectedBlocking = isBookingStatusBlocking('REJECTED');
    const overlapWithRejected = hasDateRangeOverlap('2026-09-10', '2026-09-15', [
      { checkIn: '2026-09-10', checkOut: '2026-09-15', status: 'REJECTED' },
    ]);
    results.push({
      name: 'Rule 8: REJECTED does not block dates',
      passed: !isRejectedBlocking && !overlapWithRejected,
    });
  } catch (err: any) {
    results.push({ name: 'Rule 8: REJECTED non-blocking', passed: false, error: err.message });
  }

  // Test 9: CANCELLED_BY_GUEST does not block
  try {
    const isCancelledBlocking = isBookingStatusBlocking('CANCELLED_BY_GUEST');
    const overlapWithCancelled = hasDateRangeOverlap('2026-09-10', '2026-09-15', [
      { checkIn: '2026-09-10', checkOut: '2026-09-15', status: 'CANCELLED_BY_GUEST' },
    ]);
    results.push({
      name: 'Rule 9: CANCELLED_BY_GUEST does not block dates',
      passed: !isCancelledBlocking && !overlapWithCancelled,
    });
  } catch (err: any) {
    results.push({ name: 'Rule 9: CANCELLED_BY_GUEST non-blocking', passed: false, error: err.message });
  }

  // Test 10: EXPIRED does not block
  try {
    const isExpiredBlocking = isBookingStatusBlocking('EXPIRED');
    const overlapWithExpired = hasDateRangeOverlap('2026-09-10', '2026-09-15', [
      { checkIn: '2026-09-10', checkOut: '2026-09-15', status: 'EXPIRED' },
    ]);
    results.push({
      name: 'Rule 10: EXPIRED does not block dates',
      passed: !isExpiredBlocking && !overlapWithExpired,
    });
  } catch (err: any) {
    results.push({ name: 'Rule 10: EXPIRED non-blocking', passed: false, error: err.message });
  }

  // =========================================================================
  // 3. QUOTE & BOOKING REVALIDATION
  // =========================================================================

  // Test 11: Quote follows same availability rule
  try {
    // Attempt quote for demo property overlapping with CONFIRMED range 2026-09-08 -> 2026-09-12
    const overlapRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/calculate', customerHeaders, {
      propertyId: 'prop-pub-001',
      checkIn: '2026-09-09',
      checkOut: '2026-09-13',
      guests: 2,
    });
    // Attempt quote for valid available range
    const validRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/calculate', customerHeaders, {
      propertyId: 'prop-pub-001',
      checkIn: '2026-09-01',
      checkOut: '2026-09-05',
      guests: 2,
    });
    results.push({
      name: 'Rule 11: Quote endpoint enforces canonical availability blocking (409 on overlap, 200 on available)',
      passed: overlapRes.statusCode === 409 && validRes.statusCode === 200,
    });
  } catch (err: any) {
    results.push({ name: 'Rule 11: Quote availability rule', passed: false, error: err.message });
  }

  // Test 12: Booking creation follows same availability rule
  try {
    const overlapBookingRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeaders, {
      propertyId: 'prop-pub-001',
      checkIn: '2026-09-09',
      checkOut: '2026-09-13',
      totalGuests: 2,
    });
    results.push({
      name: 'Rule 12: Booking creation revalidates availability and rejects overlap with 409 DATE_OVERLAP',
      passed: overlapBookingRes.statusCode === 409,
    });
  } catch (err: any) {
    results.push({ name: 'Rule 12: Booking availability rule', passed: false, error: err.message });
  }

  // Test 13: Quote still uses DB-authoritative pricing
  try {
    const quoteRes = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/calculate', customerHeaders, {
      propertyId: 'prop-pub-001',
      checkIn: '2026-09-01',
      checkOut: '2026-09-05',
      guests: 2,
      basePricePerNight: 100, // Client tries to supply fake price
    });
    const quoteBody: any = quoteRes.body;
    results.push({
      name: 'Rule 13: Quote strictly uses DB price (7500 * 4 = 30000) ignoring client-supplied price',
      passed:
        quoteRes.statusCode === 200 &&
        quoteBody?.data?.pricePerNight === 7500 &&
        quoteBody?.data?.totalStay === 30000 &&
        quoteBody?.data?.depositAmount === 7500,
    });
  } catch (err: any) {
    results.push({ name: 'Rule 13: DB-authoritative pricing', passed: false, error: err.message });
  }

  // Test 14: Availability failures still fail closed
  try {
    const unknownAvailRes = await app.handleHttpRequest('GET', '/api/v1/customer/properties/unknown-property-id/availability', customerHeaders);
    results.push({
      name: 'Rule 14: Availability failures still fail closed (returns 404/403/500, never fake open dates)',
      passed: unknownAvailRes.statusCode === 404 || unknownAvailRes.statusCode === 403 || unknownAvailRes.statusCode === 500,
    });
  } catch (err: any) {
    results.push({ name: 'Rule 14: Fail-closed availability', passed: false, error: err.message });
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

if (process.argv[1]?.endsWith('customerPropertyDecision.test.ts') || process.argv[1]?.endsWith('customerPropertyDecision.test.js')) {
  runCustomerPropertyDecisionSuite().then((s) => {
    console.log('\n======================================================================');
    console.log('       CUSTOMER PROPERTY DECISION CLUSTER TEST SUITE');
    console.log('======================================================================');
    s.results.forEach((r, idx) => {
      console.log(`  [16.${idx + 1}] ${r.passed ? '✅ PASS' : '❌ FAIL'} - ${r.name} ${r.error ? `(${r.error})` : ''}`);
    });
    console.log('======================================================================');
    console.log(`TOTAL: ${s.total} | PASSED: ${s.passed} | FAILED: ${s.failed}`);
    console.log('======================================================================');
    if (s.failed > 0) process.exit(1);
  });
}
