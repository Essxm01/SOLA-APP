-- PAYMENT-01: one atomic deposit finalization boundary for the Worker.
-- This function deliberately consumes the existing booking financial summary;
-- it never reconstructs or inserts financial values during payment.
CREATE OR REPLACE FUNCTION public.konfrm_complete_deposit_payment(
  p_payment_transaction_id UUID,
  p_booking_id UUID,
  p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx payment_transactions%ROWTYPE;
  v_booking bookings%ROWTYPE;
  v_summary booking_financial_summaries%ROWTYPE;
  v_pending NUMERIC(12,2);
  v_ledger_key TEXT;
BEGIN
  SELECT * INTO v_tx
  FROM payment_transactions
  WHERE id = p_payment_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_TRANSACTION_NOT_FOUND';
  END IF;

  IF v_tx.booking_id <> p_booking_id OR v_tx.customer_id <> p_customer_id THEN
    RAISE EXCEPTION 'PAYMENT_TRANSACTION_SCOPE_MISMATCH';
  END IF;

  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND OR v_booking.customer_id <> p_customer_id THEN
    RAISE EXCEPTION 'BOOKING_CUSTOMER_SCOPE_MISMATCH';
  END IF;

  IF v_tx.status = 'SUCCEEDED' THEN
    RETURN jsonb_build_object(
      'paymentTransactionId', v_tx.id,
      'paymentStatus', v_tx.status,
      'bookingId', v_booking.id,
      'bookingStatus', v_booking.status,
      'confirmedAt', v_booking.confirmed_at,
      'amountCents', v_tx.amount_cents,
      'currency', v_tx.currency,
      'idempotent', true
    );
  END IF;

  IF v_booking.status <> 'APPROVED_PENDING_PAYMENT' THEN
    RAISE EXCEPTION 'BOOKING_NOT_APPROVED_FOR_PAYMENT';
  END IF;

  IF v_tx.status NOT IN ('INITIATED', 'PENDING') THEN
    RAISE EXCEPTION 'PAYMENT_TRANSACTION_NOT_COMPLETABLE';
  END IF;

  SELECT * INTO v_summary
  FROM booking_financial_summaries
  WHERE booking_id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_FINANCIAL_SUMMARY_NOT_FOUND';
  END IF;

  IF v_tx.currency <> 'EGP'
     OR v_tx.amount_cents <> ROUND(v_summary.deposit_amount * 100)::INTEGER THEN
    RAISE EXCEPTION 'PAYMENT_AMOUNT_CURRENCY_MISMATCH';
  END IF;

  UPDATE payment_transactions
  SET status = 'SUCCEEDED',
      provider_transaction_id = COALESCE(provider_transaction_id, 'prototype_' || id::TEXT),
      verified_at = NOW(),
      updated_at = NOW()
  WHERE id = v_tx.id;

  UPDATE bookings
  SET status = 'CONFIRMED',
      confirmed_at = COALESCE(confirmed_at, NOW())
  WHERE id = v_booking.id;

  v_ledger_key := 'DEPOSIT_HELD_' || v_tx.id::TEXT;

  IF NOT EXISTS (
    SELECT 1 FROM wallet_ledger_entries WHERE idempotency_key = v_ledger_key
  ) THEN
    INSERT INTO owner_wallets (owner_id, available_balance, pending_balance, held_balance, reserved_for_payout_balance)
    VALUES (v_booking.owner_id, 0.00, 0.00, 0.00, 0.00)
    ON CONFLICT (owner_id) DO NOTHING;

    SELECT pending_balance INTO v_pending
    FROM owner_wallets
    WHERE owner_id = v_booking.owner_id
    FOR UPDATE;

    v_pending := COALESCE(v_pending, 0.00) + v_summary.owner_net_deposit_amount;

    UPDATE owner_wallets
    SET pending_balance = v_pending,
        updated_at = NOW()
    WHERE owner_id = v_booking.owner_id;

    INSERT INTO wallet_ledger_entries (
      owner_id, booking_id, transaction_type, amount, balance_after, idempotency_key
    ) VALUES (
      v_booking.owner_id, v_booking.id, 'DEPOSIT_HELD_IN_ESCROW',
      v_summary.owner_net_deposit_amount, v_pending, v_ledger_key
    );
  END IF;

  RETURN jsonb_build_object(
    'paymentTransactionId', v_tx.id,
    'paymentStatus', 'SUCCEEDED',
    'bookingId', v_booking.id,
    'bookingStatus', 'CONFIRMED',
    'confirmedAt', COALESCE(v_booking.confirmed_at, NOW()),
    'amountCents', v_tx.amount_cents,
    'currency', v_tx.currency,
    'idempotent', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.konfrm_complete_deposit_payment(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.konfrm_complete_deposit_payment(UUID, UUID, UUID) TO service_role;
