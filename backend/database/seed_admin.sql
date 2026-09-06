-- ============================================================================
-- SOLA VACATION RENTALS — INITIAL ADMIN SEED SCRIPT (PARAMETERIZED)
-- Location: backend/database/seed_admin.sql
-- Note: Requires :ADMIN_PASSWORD_HASH variable to be supplied at execution time.
-- Example: psql -v ADMIN_PASSWORD_HASH="'<bcrypt_hash>'" -f seed_admin.sql
-- ============================================================================

\if :{?ADMIN_PASSWORD_HASH}
  INSERT INTO admin_users (id, email, password_hash, full_name, role, is_active)
  VALUES (
      '00000000-0000-0000-0000-000000000001',
      'admin@sola.com',
      :'ADMIN_PASSWORD_HASH',
      'مسئول منصة صولا',
      'ADMIN',
      TRUE
  )
  ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash;
\else
  \echo 'ERROR: ADMIN_PASSWORD_HASH variable is required. Pass via -v ADMIN_PASSWORD_HASH="<bcrypt_hash>"'
\endif
