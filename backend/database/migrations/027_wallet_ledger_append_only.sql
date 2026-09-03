-- P1.6 — wallet ledger append-only integrity (repository only; unapplied).
--
-- wallet_ledger_entries is canonical immutable financial activity. No approved
-- production flow updates or deletes ledger rows (migration 019 only INSERTs),
-- but nothing at the database level made accidental mutation non-credible.
-- This migration adds the smallest safe enforcement: a BEFORE UPDATE OR DELETE
-- trigger that rejects any ledger mutation while leaving INSERT untouched, so
-- the existing deposit-credit flow (019) and future append-only accounting
-- keep working unchanged.
--
-- Deliberately out of scope: RLS/ACL posture (Phase 14), payout/release rules
-- (P11.2/P11.3), and any change to wallet balance semantics.

BEGIN;

CREATE OR REPLACE FUNCTION public.konfrm_wallet_ledger_append_only_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Reconcile ledger immutability with the existing booking FK ON DELETE SET NULL.
  -- The only permitted UPDATE is a nested referential-nulling transition where
  -- OLD.booking_id IS NOT NULL -> NEW.booking_id IS NULL, triggered by a foreign key
  -- action (pg_trigger_depth() > 1), with every other ledger field unchanged.
  IF TG_OP = 'UPDATE'
     AND pg_trigger_depth() > 1
     AND OLD.booking_id IS NOT NULL
     AND NEW.booking_id IS NULL
     AND NEW.id IS NOT DISTINCT FROM OLD.id
     AND NEW.owner_id IS NOT DISTINCT FROM OLD.owner_id
     AND NEW.payout_request_id IS NOT DISTINCT FROM OLD.payout_request_id
     AND NEW.dispute_id IS NOT DISTINCT FROM OLD.dispute_id
     AND NEW.transaction_type IS NOT DISTINCT FROM OLD.transaction_type
     AND NEW.amount IS NOT DISTINCT FROM OLD.amount
     AND NEW.balance_after IS NOT DISTINCT FROM OLD.balance_after
     AND NEW.idempotency_key IS NOT DISTINCT FROM OLD.idempotency_key
     AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'WALLET_LEDGER_IMMUTABLE';
END;
$$;

DROP TRIGGER IF EXISTS konfrm_wallet_ledger_append_only_trg ON public.wallet_ledger_entries;
CREATE TRIGGER konfrm_wallet_ledger_append_only_trg
  BEFORE UPDATE OR DELETE
  ON public.wallet_ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.konfrm_wallet_ledger_append_only_guard();

DROP TRIGGER IF EXISTS konfrm_wallet_ledger_truncate_guard_trg ON public.wallet_ledger_entries;
CREATE TRIGGER konfrm_wallet_ledger_truncate_guard_trg
  BEFORE TRUNCATE
  ON public.wallet_ledger_entries
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.konfrm_wallet_ledger_append_only_guard();

-- The guard is an implementation internal: no direct executable surface.
REVOKE ALL ON FUNCTION public.konfrm_wallet_ledger_append_only_guard()
  FROM PUBLIC, anon, authenticated;

INSERT INTO public.schema_migrations (version)
VALUES ('027_wallet_ledger_append_only.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;
