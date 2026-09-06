BEGIN;

-- Narrow partial expression index to support persistent admin login abuse throttling queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_failed_login
ON public.audit_logs ((payload->>'key'), created_at DESC)
WHERE entity_type = 'ADMIN_AUTH' AND action = 'ADMIN_LOGIN_FAILED';

INSERT INTO public.schema_migrations (version)
VALUES ('030_audit_logs_admin_throttle_index.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;
