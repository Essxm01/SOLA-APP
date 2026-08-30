-- P14.1: restore the server-only execution boundary for critical mutating RPCs.
-- This migration changes ACL/search-path metadata only. It does not change
-- payment, Owner-registration, KYC, RLS-policy, table, or business data logic.

BEGIN;

-- PostgreSQL default function privileges in this project grant EXECUTE to
-- ordinary Supabase roles. Revoke them explicitly so later migration history
-- cannot leave these SECURITY DEFINER boundaries publicly callable.
REVOKE ALL ON FUNCTION public.konfrm_complete_deposit_payment(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.konfrm_register_owner(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.konfrm_submit_owner_kyc(UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.konfrm_review_owner_kyc(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.konfrm_complete_deposit_payment(UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.konfrm_register_owner(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.konfrm_submit_owner_kyc(UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.konfrm_review_owner_kyc(UUID, TEXT, TEXT) TO service_role;

-- The function is the handler for the platform's ensure_rls event trigger;
-- no application route calls it. Event-trigger execution does not require
-- ordinary API roles to retain direct EXECUTE permission.
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role;

-- This trigger only raises an exception. Pinning its lookup path removes the
-- advisor warning without changing the append-only UPDATE/DELETE behavior.
ALTER FUNCTION public.prevent_dispute_evidence_mutation()
  SET search_path = pg_catalog;

INSERT INTO public.schema_migrations (version)
VALUES ('021_harden_critical_rpc_privileges.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;
