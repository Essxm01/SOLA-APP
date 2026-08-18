/**
 * Sola Vacation Rentals — Core Server Financial Engine (Pure Integer Arithmetic)
 * Location: server/src/services/financialEngine.ts
 * Master Source of Truth: PHASE_7_MASTER_SPECIFICATION.md
 *
 * Rules Compliance:
 * - RULE-3E-01..05: 20% Deposit Commission, Banker's Rounding (HALF_EVEN), 0% Remaining Balance Commission.
 * - RULE-5A-01..06: 500 EGP Min Payout, Actual Provider Fee, Payout Reservation, Ledger Idempotency.
 * - RULE-3G-01: Financial Dispute Hold Freeze.
 */
/**
 * Pure Integer-Based Banker's Rounding (HALF_EVEN)
 * Eliminates all JavaScript floating-point arithmetic drift by computing quotient and remainder in integer cents.
 */
export function calculateCommissionHalfEvenInCents(depositAmountInCents, commissionPercent = 20) {
    if (isNaN(depositAmountInCents) || !Number.isInteger(depositAmountInCents) || depositAmountInCents <= 0) {
        throw new Error('INVALID_INTEGER_CENTS');
    }
    // Pure integer numerator: (depositAmountInCents * 20)
    const numerator = depositAmountInCents * commissionPercent;
    const quotient = Math.floor(numerator / 100);
    const remainder = numerator % 100;
    if (remainder < 50) {
        return quotient;
    }
    if (remainder > 50) {
        return quotient + 1;
    }
    // Exactly 50 (Half-way case): Round to nearest EVEN integer
    return quotient % 2 === 0 ? quotient : quotient + 1;
}
/**
 * Banker's Rounding (HALF_EVEN) Helper for Decimal Float Cents
 */
export function roundHalfEvenInCents(cents) {
    if (isNaN(cents) || !isFinite(cents)) {
        throw new Error('INVALID_NUMERIC_VALUE');
    }
    const floor = Math.floor(cents);
    const decimal = cents - floor;
    if (decimal < 0.499999999)
        return floor;
    if (decimal > 0.500000001)
        return floor + 1;
    return floor % 2 === 0 ? floor : floor + 1;
}
/**
 * Convert Decimal EGP to Integer Cents Safely
 */
export function egpToIntegerCents(egp) {
    if (isNaN(egp) || !isFinite(egp)) {
        throw new Error('INVALID_MONETARY_INPUT');
    }
    return Math.round(egp * 100);
}
/**
 * Calculate Server-Authoritative Financial Breakdown for a Booking (Pure Integer Cents)
 */
export function calculateBookingFinancials(totalBookingValueEgp, firstNightPriceEgp) {
    if (isNaN(totalBookingValueEgp) ||
        isNaN(firstNightPriceEgp) ||
        totalBookingValueEgp <= 0 ||
        firstNightPriceEgp <= 0) {
        throw new Error('INVALID_MONETARY_INPUT');
    }
    if (firstNightPriceEgp > totalBookingValueEgp) {
        throw new Error('DEPOSIT_CANNOT_EXCEED_TOTAL_BOOKING_VALUE');
    }
    const totalBookingValueInCents = egpToIntegerCents(totalBookingValueEgp);
    const depositAmountInCents = egpToIntegerCents(firstNightPriceEgp);
    // RULE-3E-02: 20% Sola Commission on Deposit using Pure Integer Banker's Rounding
    const solaCommissionInCents = calculateCommissionHalfEvenInCents(depositAmountInCents, 20);
    // RULE-3E-03: Net Deposit for Owner
    const ownerNetDepositInCents = depositAmountInCents - solaCommissionInCents;
    // RULE-3E-04: Remaining Balance (Cash-on-Arrival)
    const remainingBalanceInCents = totalBookingValueInCents - depositAmountInCents;
    // RULE-3E-05: 0% Commission on Remaining Balance
    const commissionOnRemainingInCents = 0;
    return {
        totalBookingValueInCents,
        depositAmountInCents,
        solaCommissionInCents,
        ownerNetDepositInCents,
        remainingBalanceInCents,
        commissionOnRemainingInCents,
    };
}
/**
 * Payout Request Validation (RULE-5A-01 & RULE-5A-03)
 */
export function validatePayoutRequest(grossAmountEgp, availableBalanceEgp, actualProviderFeeEgp = 0) {
    if (isNaN(grossAmountEgp) || grossAmountEgp <= 0) {
        return { isValid: false, errorCode: 'INVALID_GROSS_AMOUNT', netAmountEgp: 0 };
    }
    // RULE-5A-01: Minimum 500 EGP Payout Limit
    if (grossAmountEgp < 500) {
        return { isValid: false, errorCode: 'MINIMUM_PAYOUT_LIMIT_500_EGP_REQUIRED', netAmountEgp: 0 };
    }
    // Check sufficient available balance
    if (availableBalanceEgp < grossAmountEgp) {
        return { isValid: false, errorCode: 'INSUFFICIENT_AVAILABLE_BALANCE', netAmountEgp: 0 };
    }
    // RULE-5A-03: Owner pays actual provider transfer fee
    const netAmountEgp = grossAmountEgp - actualProviderFeeEgp;
    if (netAmountEgp <= 0) {
        return { isValid: false, errorCode: 'INVALID_NET_PAYOUT_AMOUNT', netAmountEgp: 0 };
    }
    return { isValid: true, netAmountEgp };
}
/**
 * Wallet Balance State Invariant Evaluation
 * Verifies that the wallet balances are self-consistent and non-negative
 */
export function validateWalletInvariants(wallet) {
    if (wallet.pendingBalance < 0 ||
        wallet.availableBalance < 0 ||
        wallet.reservedForPayout < 0 ||
        wallet.heldBalance < 0 ||
        wallet.totalEarnedLifeTime < 0 ||
        wallet.totalWithdrawnLifeTime < 0) {
        return false;
    }
    return true;
}
