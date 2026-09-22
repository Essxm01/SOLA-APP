-- CUSTOMER AUTH V2 — EMAIL-FIRST NULLABLE PHONE BOUNDARY
-- Migration: 032_customer_email_first_nullable_phone.sql
--
-- Founder-approved product rule:
--   A Customer may be created with a verified EMAIL and no phone number.
--
-- Safety boundaries:
--   * This migration changes ONLY public.users.phone_number nullability.
--   * public.owners.phone_number remains mandatory and is not altered here.
--   * No fake/placeholder phone numbers are introduced.
--   * public.user_identifiers remains the canonical verified login mapping.
--   * PostgreSQL UNIQUE semantics on users.phone_number continue to protect
--     non-null phones while allowing multiple NULL email-only Customer rows.

BEGIN;

ALTER TABLE public.users
  ALTER COLUMN phone_number DROP NOT NULL;

COMMENT ON COLUMN public.users.phone_number IS
  'Canonical verified phone when present. Nullable for Customer accounts created with verified email only; Owner flows enforce phone separately.';

INSERT INTO public.schema_migrations (version)
VALUES ('032_customer_email_first_nullable_phone.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;
