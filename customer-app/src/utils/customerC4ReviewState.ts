/**
 * SOLA Customer App — Screen 07 Booking Request Review State Machine & Helper
 * Pure, deterministic helper managing Screen 07 review lifecycle, auth restoration,
 * quote revalidation, error classification, and idempotency tracking.
 */

export interface ServerPriceQuote {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  pricePerNight: number;
  totalStay: number;
  depositAmount: number;
  remainingAmount: number;
  currency: string;
  quoteFingerprint?: string;
}

export type BookingReviewUiState =
  | 'REVIEW'
  | 'REVALIDATING'
  | 'PRICE_CHANGED'
  | 'AVAILABILITY_CONFLICT'
  | 'SUBMITTING'
  | 'NETWORK_ERROR'
  | 'IDEMPOTENCY_ERROR';

export interface ReviewStateContext {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  requestId: string;
  currentQuote: ServerPriceQuote;
  previousQuote: ServerPriceQuote | null;
  uiState: BookingReviewUiState;
  submitErrorMessage: string | null;
  restoredFromAuth: boolean;
}

export function generateClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Resolves the initial state for Screen 07 on mount.
 * When restoredFromAuth is true, the screen MUST start in REVALIDATING.
 * The requestId MUST be preserved from existingRequestId if provided.
 */
export function initReviewState(params: {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  initialQuote: ServerPriceQuote;
  restoredFromAuth?: boolean;
  existingRequestId?: string | null;
}): ReviewStateContext {
  const requestId = params.existingRequestId?.trim() || generateClientRequestId();
  const uiState: BookingReviewUiState = params.restoredFromAuth ? 'REVALIDATING' : 'REVIEW';

  return {
    propertyId: params.propertyId,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    guests: params.guests,
    requestId,
    currentQuote: params.initialQuote,
    previousQuote: null,
    uiState,
    submitErrorMessage: null,
    restoredFromAuth: Boolean(params.restoredFromAuth),
  };
}

/**
 * Evaluates fresh quote from /customer/bookings/calculate.
 * If fingerprint or prices shifted -> transitions to PRICE_CHANGED with previous quote saved.
 * If price identical -> transitions to REVIEW (NO auto-submit).
 */
export function applyRevalidationSuccess(
  current: ReviewStateContext,
  freshQuote: ServerPriceQuote
): ReviewStateContext {
  const prevFingerprint = current.currentQuote.quoteFingerprint;
  const isPriceSame =
    freshQuote.totalStay === current.currentQuote.totalStay &&
    freshQuote.depositAmount === current.currentQuote.depositAmount &&
    freshQuote.pricePerNight === current.currentQuote.pricePerNight;

  const hasFingerprintShift =
    Boolean(prevFingerprint && freshQuote.quoteFingerprint && freshQuote.quoteFingerprint !== prevFingerprint);

  if (hasFingerprintShift || !isPriceSame) {
    return {
      ...current,
      previousQuote: current.currentQuote,
      currentQuote: freshQuote,
      uiState: 'PRICE_CHANGED',
      submitErrorMessage: null,
    };
  }

  return {
    ...current,
    currentQuote: freshQuote,
    uiState: 'REVIEW',
    submitErrorMessage: null,
  };
}

/**
 * Evaluates error from /customer/bookings/calculate.
 */
export function applyRevalidationError(
  current: ReviewStateContext,
  error: { status?: number; code?: string; message?: string }
): ReviewStateContext {
  if (error.status === 409 || error.code === 'DATE_OVERLAP') {
    return {
      ...current,
      uiState: 'AVAILABILITY_CONFLICT',
      submitErrorMessage: null,
    };
  }

  return {
    ...current,
    uiState: 'NETWORK_ERROR',
    submitErrorMessage: error.message || 'تعذر الاتصال بالخادم لتحديث الطلب.',
  };
}

export type SubmitResult =
  | { kind: 'SUCCESS'; data: any }
  | { kind: 'REQUIRE_AUTH'; context: { propertyId: string; checkIn: string; checkOut: string; guests: number; quoteSnapshot: ServerPriceQuote; quoteFingerprint: string; requestId: string } }
  | { kind: 'PRICE_CHANGED'; nextState: ReviewStateContext }
  | { kind: 'AVAILABILITY_CONFLICT'; nextState: ReviewStateContext }
  | { kind: 'IDEMPOTENCY_ERROR'; nextState: ReviewStateContext }
  | { kind: 'NETWORK_ERROR'; nextState: ReviewStateContext };

/**
 * Classifies HTTP response from POST /customer/bookings.
 */
export function classifySubmitResponse(
  current: ReviewStateContext,
  status: number,
  body: any
): SubmitResult {
  // 1. Success / Idempotent Replay
  if ((status === 200 || status === 201) && body?.success && body?.data) {
    return { kind: 'SUCCESS', data: body.data };
  }

  // 2. 401 / 403 Session Expiry
  if (status === 401 || status === 403) {
    return {
      kind: 'REQUIRE_AUTH',
      context: {
        propertyId: current.propertyId,
        checkIn: current.checkIn,
        checkOut: current.checkOut,
        guests: current.guests,
        quoteSnapshot: current.currentQuote,
        quoteFingerprint: current.currentQuote.quoteFingerprint || '',
        requestId: current.requestId,
      },
    };
  }

  // 3. 409 QUOTE_CHANGED
  if (status === 409 && body?.error?.code === 'QUOTE_CHANGED') {
    const freshQuote: ServerPriceQuote | undefined = body.data?.currentQuote;
    const nextQuote = freshQuote || current.currentQuote;
    return {
      kind: 'PRICE_CHANGED',
      nextState: {
        ...current,
        previousQuote: current.currentQuote,
        currentQuote: nextQuote,
        uiState: 'PRICE_CHANGED',
        submitErrorMessage: null,
      },
    };
  }

  // 4. 409 DATE_OVERLAP
  if (status === 409 && body?.error?.code === 'DATE_OVERLAP') {
    return {
      kind: 'AVAILABILITY_CONFLICT',
      nextState: {
        ...current,
        uiState: 'AVAILABILITY_CONFLICT',
        submitErrorMessage: null,
      },
    };
  }

  // 5. 409 IDEMPOTENCY_CONFLICT (Non-retryable with same requestId)
  if (status === 409 && body?.error?.code === 'IDEMPOTENCY_CONFLICT') {
    return {
      kind: 'IDEMPOTENCY_ERROR',
      nextState: {
        ...current,
        uiState: 'IDEMPOTENCY_ERROR',
        submitErrorMessage: null,
      },
    };
  }

  // 6. Generic / Server / Network Error (Safe retry with same requestId)
  return {
    kind: 'NETWORK_ERROR',
    nextState: {
      ...current,
      uiState: 'NETWORK_ERROR',
      submitErrorMessage: body?.error?.message || 'تفاصيل طلبك ما زالت محفوظة. تحقق من الاتصال وحاول مرة أخرى.',
    },
  };
}
