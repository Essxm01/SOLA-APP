/**
 * Sola Vacation Rentals — Master Customer Foundation Test Suite (Phase C1)
 * Location: server/src/tests/customerFoundation.test.ts
 */

import { ExpressServerApp } from '../app';
import { CustomerDomainController } from '../controllers/domainControllers';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export async function runCustomerFoundationSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];
  const app = new ExpressServerApp();

  const customerTokenA = 'customer_cust001_token';
  const customerTokenB = 'customer_cust002_token';
  const ownerToken = 'owner_token_valid';
  const adminToken = 'admin_token_valid';

  const customerHeadersA = { authorization: `Bearer ${customerTokenA}` };
  const customerHeadersB = { authorization: `Bearer ${customerTokenB}` };
  const ownerHeaders = { authorization: `Bearer ${ownerToken}` };
  const adminHeaders = { authorization: `Bearer ${adminToken}` };

  // =========================================================================
  // 1. AUTHENTICATION & RBAC ISOLATION TESTS (1-6)
  // =========================================================================

  // Test 1: Customer token -> Customer API allowed (200 OK)
  try {
    const res = await app.handleHttpRequest('GET', '/api/v1/customer/properties/search', customerHeadersA);
    results.push({ name: 'Customer Auth 1: ROLE_CUSTOMER token -> 200 OK access allowed', passed: res.statusCode === 200 && res.body.success === true });
  } catch (err: any) {
    results.push({ name: 'Customer Auth 1: ROLE_CUSTOMER token -> 200 OK access allowed', passed: false, error: err.message });
  }

  // Test 2: Owner token -> Customer API = 403 Forbidden
  try {
    const res = await app.handleHttpRequest('GET', '/api/v1/customer/properties/search', ownerHeaders);
    results.push({ name: 'Customer RBAC 2: ROLE_OWNER token -> 403 Forbidden on Customer API', passed: res.statusCode === 403 });
  } catch (err: any) {
    results.push({ name: 'Customer RBAC 2: ROLE_OWNER token -> 403 Forbidden on Customer API', passed: false, error: err.message });
  }

  // Test 3: Customer token -> Owner API = 403 Forbidden
  try {
    const res = await app.handleHttpRequest('GET', '/api/v1/owner/properties', customerHeadersA);
    results.push({ name: 'Customer RBAC 3: ROLE_CUSTOMER token -> 403 Forbidden on Owner API', passed: res.statusCode === 403 });
  } catch (err: any) {
    results.push({ name: 'Customer RBAC 3: ROLE_CUSTOMER token -> 403 Forbidden on Owner API', passed: false, error: err.message });
  }

  // Test 4: Customer token -> Admin API = 403 Forbidden
  try {
    const res = await app.handleHttpRequest('POST', '/api/v1/admin/properties/p1/review', customerHeadersA, { decision: 'PUBLISHED' });
    results.push({ name: 'Customer RBAC 4: ROLE_CUSTOMER token -> 403 Forbidden on Admin API', passed: res.statusCode === 403 });
  } catch (err: any) {
    results.push({ name: 'Customer RBAC 4: ROLE_CUSTOMER token -> 403 Forbidden on Admin API', passed: false, error: err.message });
  }

  // Test 5: Missing token on Customer API -> 401 Unauthorized
  try {
    const res = await app.handleHttpRequest('GET', '/api/v1/customer/properties/search', {});
    results.push({ name: 'Customer Auth 5: Missing token -> 401 Unauthorized', passed: res.statusCode === 401 });
  } catch (err: any) {
    results.push({ name: 'Customer Auth 5: Missing token -> 401 Unauthorized', passed: false, error: err.message });
  }

  // Test 6: Invalid token on Customer API -> 401 Unauthorized
  try {
    const res = await app.handleHttpRequest('GET', '/api/v1/customer/properties/search', { authorization: 'Bearer invalid_token' });
    results.push({ name: 'Customer Auth 6: Invalid token -> 401 Unauthorized', passed: res.statusCode === 401 });
  } catch (err: any) {
    results.push({ name: 'Customer Auth 6: Invalid token -> 401 Unauthorized', passed: false, error: err.message });
  }

  // =========================================================================
  // 2. PROPERTY SEARCH & SANITIZATION TESTS (7-9)
  // =========================================================================

  // Test 7: Property Search returns ONLY PUBLISHED properties
  try {
    const mockAllProps: any[] = [
      { id: 'p1', status: 'PUBLISHED' },
      { id: 'p2', status: 'DRAFT' },
      { id: 'p3', status: 'PENDING_REVIEW' },
      { id: 'p4', status: 'ARCHIVED' },
      { id: 'p5', status: 'PUBLISHED' },
    ];
    const filtered = CustomerDomainController.filterPublishedProperties(mockAllProps);
    const allPublished = filtered.every((p) => p.status === 'PUBLISHED') && filtered.length === 2;
    results.push({ name: 'Customer Property 1: Property search returns ONLY PUBLISHED properties', passed: allPublished });
  } catch (err: any) {
    results.push({ name: 'Customer Property 1: Property search returns ONLY PUBLISHED properties', passed: false, error: err.message });
  }

  // Test 8: Property details sanitizes and hides owner private data
  try {
    const mockProp: any = {
      id: 'p1',
      ownerId: 'secret_owner_123',
      title: 'Chalet Sea View',
      unitType: 'شاليه',
      propertyType: 'CHALET',
      address: 'North Coast',
      bedrooms: 2,
      bathrooms: 1,
      maxGuests: 4,
      basePricePerNight: 5000,
      status: 'PUBLISHED',
      verificationStatus: 'VERIFIED',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };
    const sanitized = CustomerDomainController.sanitizePropertyForCustomer(mockProp);
    const isPrivateDataHidden = !('ownerId' in sanitized) && !('verificationStatus' in sanitized);
    results.push({ name: 'Customer Property 2: Property details hides owner private data', passed: isPrivateDataHidden && sanitized.status === 'PUBLISHED' });
  } catch (err: any) {
    results.push({ name: 'Customer Property 2: Property details hides owner private data', passed: false, error: err.message });
  }

  // Test 9: Unpublished property details request rejected
  try {
    const mockProp: any = { id: 'p2', status: 'DRAFT' };
    CustomerDomainController.sanitizePropertyForCustomer(mockProp);
    results.push({ name: 'Customer Property 3: Unpublished property details request rejection', passed: false, error: 'Should have thrown' });
  } catch (err: any) {
    results.push({ name: 'Customer Property 3: Unpublished property details request rejection', passed: err.message === 'PROPERTY_NOT_PUBLISHED' });
  }

  // =========================================================================
  // 3. BOOKING CREATION & FINANCIAL BREAKDOWN TESTS (10-13)
  // =========================================================================

  // Test 10: Valid customer booking creation foundation
  try {
    const res = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeadersA, {
      propertyId: 'prop-pub-001',
      checkIn: '2026-09-01',
      checkOut: '2026-09-05',
      totalGuests: 2,
    });
    const isCreated = res.statusCode === 201 && res.body.data.status === 'PENDING_OWNER_APPROVAL';
    results.push({ name: 'Customer Booking 1: Booking creation foundation with PENDING_OWNER_APPROVAL status', passed: isCreated });
  } catch (err: any) {
    results.push({ name: 'Customer Booking 1: Booking creation foundation with PENDING_OWNER_APPROVAL status', passed: false, error: err.message });
  }

  // Test 11: Booking financial breakdown accuracy (20% Deposit, Banker's Rounding, 0% Remaining Commission)
  try {
    const res = await app.handleHttpRequest('POST', '/api/v1/customer/bookings', customerHeadersA, {
      propertyId: 'prop-pub-001',
      checkIn: '2026-09-01',
      checkOut: '2026-09-05',
      totalGuests: 2,
    });
    const fin = res.body.data.financialSummary;
    // 4 nights @ 5000 = 20,000 total. Deposit = 5,000 (1 night min). Sola Comm = 1,000 (20%). Net Owner Dep = 4,000. Remaining = 15,000.
    const isAccurate = fin.totalBookingValue === 20000 && fin.depositAmount === 5000 && fin.solaCommissionAmount === 1000 && fin.ownerNetDepositAmount === 4000 && fin.remainingBalance === 15000 && fin.commissionOnRemainingBalance === 0;
    results.push({ name: 'Customer Booking 2: Financial breakdown calculation accuracy', passed: isAccurate });
  } catch (err: any) {
    results.push({ name: 'Customer Booking 2: Financial breakdown calculation accuracy', passed: false, error: err.message });
  }

  // Test 12: Invalid check-out date (checkOut <= checkIn) rejected
  try {
    const mockProp: any = { status: 'PUBLISHED', maxGuests: 4, basePricePerNight: 5000 };
    CustomerDomainController.validateCustomerBookingRequest(mockProp, '2026-09-05', '2026-09-01', 2);
    results.push({ name: 'Customer Booking 3: Invalid check-out date range rejection', passed: false, error: 'Should have thrown' });
  } catch (err: any) {
    results.push({ name: 'Customer Booking 3: Invalid check-out date range rejection', passed: err.message === 'INVALID_BOOKING_DATE_RANGE' });
  }

  // Test 13: Booking for unpublished property rejected
  try {
    const mockProp: any = { status: 'DRAFT', maxGuests: 4, basePricePerNight: 5000 };
    CustomerDomainController.validateCustomerBookingRequest(mockProp, '2026-09-01', '2026-09-05', 2);
    results.push({ name: 'Customer Booking 4: Booking for unpublished property rejection', passed: false, error: 'Should have thrown' });
  } catch (err: any) {
    results.push({ name: 'Customer Booking 4: Booking for unpublished property rejection', passed: err.message === 'CANNOT_BOOK_UNPUBLISHED_PROPERTY' });
  }

  // =========================================================================
  // 4. BOOKING LIST & IDOR ISOLATION TESTS (14-15)
  // =========================================================================

  // Test 14: Customer A gets only Customer A's bookings
  try {
    const resA = await app.handleHttpRequest('GET', '/api/v1/customer/bookings', customerHeadersA);
    const bookingsA = resA.body.data;
    const isCustomerAOnly = Array.isArray(bookingsA) && bookingsA.every((b: any) => b.customerId === 'cust001');
    results.push({ name: 'Customer IDOR 1: Customer A receives only Customer A bookings', passed: isCustomerAOnly });
  } catch (err: any) {
    results.push({ name: 'Customer IDOR 1: Customer A receives only Customer A bookings', passed: false, error: err.message });
  }

  // Test 15: Customer B gets Customer B's identity (IDOR separation)
  try {
    const resB = await app.handleHttpRequest('GET', '/api/v1/customer/bookings', customerHeadersB);
    const bookingsB = resB.body.data;
    const isCustomerBOnly = Array.isArray(bookingsB) && bookingsB.every((b: any) => b.customerId === 'cust002');
    results.push({ name: 'Customer IDOR 2: Customer B identity isolated from Customer A', passed: isCustomerBOnly });
  } catch (err: any) {
    results.push({ name: 'Customer IDOR 2: Customer B identity isolated from Customer A', passed: false, error: err.message });
  }

  // =========================================================================
  // 5. BOOKING CANCELLATION TESTS (16)
  // =========================================================================

  // Test 16: Customer booking cancellation transition to CANCELLED_BY_GUEST
  try {
    const res = await app.handleHttpRequest('POST', '/api/v1/customer/bookings/booking_c1_001/cancel', customerHeadersA);
    const isCancelled = res.statusCode === 200 && res.body.data.status === 'CANCELLED_BY_GUEST';
    results.push({ name: 'Customer Cancellation 1: Booking cancellation transition to CANCELLED_BY_GUEST', passed: isCancelled });
  } catch (err: any) {
    results.push({ name: 'Customer Cancellation 1: Booking cancellation transition to CANCELLED_BY_GUEST', passed: false, error: err.message });
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return { total: results.length, passed, failed, results };
}
