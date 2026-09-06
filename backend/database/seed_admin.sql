-- ============================================================================
-- SOLA VACATION RENTALS — INITIAL ADMIN SEED SCRIPT
-- Location: backend/database/seed_admin.sql
-- Note: Canonical admin authentication uses bcrypt password_hash verification.
-- ============================================================================

INSERT INTO admin_users (id, email, password_hash, full_name, role, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@sola.com',
    '$2b$10$X8T.Yt2C0a0C3x9/ZgS1a.4A4A4A4A4A4A4A4A4A4A4A4A4A4A4A4',
    'مسئول منصة صولا',
    'ADMIN',
    TRUE
)
ON CONFLICT (email) DO NOTHING;
