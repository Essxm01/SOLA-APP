/**
 * Sola Vacation Rentals — Financial Engine & Domain Controller Test Suite
 * Location: server/src/tests/financialDomain.test.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 */
import { calculateBookingFinancials, validatePayoutRequest, roundHalfEvenInCents } from '../services/financialEngine';
import { PropertyDomainController, BookingDomainController, DisputeDomainController } from '../controllers/domainControllers';
export async function runFinancialDomainSuite() {
    const results = [];
    // Test 1: Banker's Rounding (HALF_EVEN) in Integer Cents
    try {
        // 2.50 => 2 (even), 3.50 => 4 (even), 2.51 => 3, 2.49 => 2
        const r1 = roundHalfEvenInCents(2.50);
        const r2 = roundHalfEvenInCents(3.50);
        const r3 = roundHalfEvenInCents(2.51);
        const r4 = roundHalfEvenInCents(2.49);
        const isCorrect = (r1 === 2) && (r2 === 4) && (r3 === 3) && (r4 === 2);
        results.push({ name: 'Financial 1: Banker\'s Rounding (HALF_EVEN) integer cents math', passed: isCorrect });
    }
    catch (err) {
        results.push({ name: 'Financial 1: Banker\'s Rounding (HALF_EVEN) integer cents math', passed: false, error: err.message });
    }
    // Test 2: Deposit 20% Commission & 0% Remaining Balance Commission
    try {
        const fin = calculateBookingFinancials(1000, 300); // Total 1000 EGP, First night 300 EGP
        const depositOk = fin.depositAmountInCents === 30000;
        const commissionOk = fin.solaCommissionInCents === 6000; // 20% of 300 = 60 EGP
        const ownerNetOk = fin.ownerNetDepositInCents === 24000; // 300 - 60 = 240 EGP
        const remainingOk = fin.remainingBalanceInCents === 70000; // 1000 - 300 = 700 EGP
        const commRemainingZero = fin.commissionOnRemainingInCents === 0;
        const allOk = depositOk && commissionOk && ownerNetOk && remainingOk && commRemainingZero;
        results.push({ name: 'Financial 2: Deposit 20% commission & 0% remaining balance commission', passed: allOk });
    }
    catch (err) {
        results.push({ name: 'Financial 2: Deposit 20% commission & 0% remaining balance commission', passed: false, error: err.message });
    }
    // Test 3: Minimum 500 EGP Payout Limit (RULE-5A-01)
    try {
        const lowPayout = validatePayoutRequest(400, 1000, 10);
        const validPayout = validatePayoutRequest(500, 1000, 15);
        const isGuarded = (!lowPayout.isValid) && (lowPayout.errorCode === 'MINIMUM_PAYOUT_LIMIT_500_EGP_REQUIRED') && validPayout.isValid && (validPayout.netAmountEgp === 485);
        results.push({ name: 'Financial 3: Minimum 500 EGP payout limit enforcement', passed: isGuarded });
    }
    catch (err) {
        results.push({ name: 'Financial 3: Minimum 500 EGP payout limit enforcement', passed: false, error: err.message });
    }
    // Test 4: Property Archive Restoration to DRAFT ONLY (RULE-4C-01)
    try {
        const archivedProperty = {
            id: 'prop-1',
            ownerId: 'owner-1',
            title: 'شاليه راس الحكمة',
            status: 'ARCHIVED',
            verificationStatus: 'VERIFIED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const restored = PropertyDomainController.restoreProperty(archivedProperty);
        results.push({ name: 'Domain 1: Property archive restores to DRAFT ONLY (RULE-4C-01)', passed: restored.status === 'DRAFT' });
    }
    catch (err) {
        results.push({ name: 'Domain 1: Property archive restores to DRAFT ONLY (RULE-4C-01)', passed: false, error: err.message });
    }
    // Test 5: Hard Delete Protection for Active Bookings (RULE-4C-02)
    try {
        const activeProperty = {
            id: 'prop-2',
            ownerId: 'owner-1',
            title: 'فيلا مراسي',
            status: 'PUBLISHED',
            verificationStatus: 'VERIFIED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        PropertyDomainController.validateHardDelete(activeProperty, 2); // 2 active bookings
        results.push({ name: 'Domain 2: Hard delete protection with active bookings (RULE-4C-02)', passed: false, error: 'Should have thrown CANNOT_DELETE_PROPERTY_WITH_ACTIVE_BOOKINGS' });
    }
    catch (err) {
        results.push({ name: 'Domain 2: Hard delete protection with active bookings (RULE-4C-02)', passed: err.message === 'CANNOT_DELETE_PROPERTY_WITH_ACTIVE_BOOKINGS' });
    }
    // Test 6: 60-Minute Self-Service Modification Window (RULE-3C-01)
    try {
        const recentConfirmedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 mins ago
        const oldConfirmedAt = new Date(Date.now() - 90 * 60 * 1000).toISOString(); // 90 mins ago
        const recentValid = BookingDomainController.isWithin60MinuteModificationWindow(recentConfirmedAt);
        const oldExpired = BookingDomainController.isWithin60MinuteModificationWindow(oldConfirmedAt);
        results.push({ name: 'Domain 3: 60-Minute modification window evaluation (RULE-3C-01)', passed: recentValid && !oldExpired });
    }
    catch (err) {
        results.push({ name: 'Domain 3: 60-Minute modification window evaluation (RULE-3C-01)', passed: false, error: err.message });
    }
    // Test 7: Financial Dispute Hold Payload (RULE-3G-01)
    try {
        const mockDispute = {
            id: 'disp-101',
            bookingId: 'bk-505',
            propertyId: 'prop-1',
            renterId: 'renter-99',
            ownerId: 'owner-1',
            propertyTitle: 'شاليه راس الحكمة',
            propertyImage: '',
            locationName: 'راس الحكمة',
            renterName: 'أحمد محمود',
            renterAvatar: '',
            renterPhone: '+201000000009',
            type: 'PROPERTY_CONDITION',
            severity: 'HIGH',
            status: 'OPENED',
            description: 'الوحدة لم تكن نظيفة',
            evidence: [],
            createdAt: new Date().toISOString(),
        };
        const holdPayload = DisputeDomainController.createDisputeHoldPayload(mockDispute, 1200);
        const isHoldValid = holdPayload.frozenAmountEgp === 1200 && holdPayload.status === 'HELD';
        results.push({ name: 'Domain 4: Financial dispute hold payload creation (RULE-3G-01)', passed: isHoldValid });
    }
    catch (err) {
        results.push({ name: 'Domain 4: Financial dispute hold payload creation (RULE-3G-01)', passed: false, error: err.message });
    }
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    return { total: results.length, passed, failed, results };
}
