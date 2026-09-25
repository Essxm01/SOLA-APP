-- P9.1 Customer notifications foundation.
-- Source-controlled only in this phase. Apply through the approved migration
-- process; this file is intentionally not executed by the application.
BEGIN;

CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  event_type VARCHAR(64) NOT NULL CHECK (event_type IN (
    'BOOKING_APPROVED_PENDING_PAYMENT',
    'BOOKING_REJECTED'
  )),
  property_title_snapshot VARCHAR(200) NULL,
  event_key TEXT GENERATED ALWAYS AS (booking_id::text || ':' || event_type) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ NULL,
  CONSTRAINT customer_notifications_event_key_unique UNIQUE (event_key)
);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer_created
  ON public.customer_notifications(customer_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_unread
  ON public.customer_notifications(customer_id)
  WHERE read_at IS NULL;

ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.konfrm_create_customer_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_type VARCHAR(64);
  v_property_title VARCHAR(200);
BEGIN
  IF OLD.status <> 'PENDING_OWNER_APPROVAL'
     OR NEW.status NOT IN ('APPROVED_PENDING_PAYMENT', 'REJECTED')
     OR NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_event_type := CASE
    WHEN NEW.status = 'APPROVED_PENDING_PAYMENT' THEN 'BOOKING_APPROVED_PENDING_PAYMENT'
    WHEN NEW.status = 'REJECTED' THEN 'BOOKING_REJECTED'
  END;

  BEGIN
    SELECT p.title
      INTO v_property_title
      FROM public.properties AS p
     WHERE p.id = NEW.property_id;
  EXCEPTION WHEN OTHERS THEN
    v_property_title := NULL;
  END;

  INSERT INTO public.customer_notifications
    (customer_id, booking_id, event_type, property_title_snapshot)
  VALUES
    (NEW.customer_id, NEW.id, v_event_type, v_property_title)
  ON CONFLICT (event_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_notifications_booking_status
  ON public.bookings;

CREATE TRIGGER trg_customer_notifications_booking_status
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW
WHEN (OLD.status = 'PENDING_OWNER_APPROVAL'
  AND NEW.status IN ('APPROVED_PENDING_PAYMENT', 'REJECTED')
  AND NEW.customer_id IS NOT NULL)
EXECUTE FUNCTION public.konfrm_create_customer_notification();

CREATE OR REPLACE FUNCTION public.konfrm_list_customer_notifications(
  p_customer_id UUID,
  p_limit INTEGER,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL
)
RETURNS TABLE (
  notification_id UUID,
  event_type VARCHAR(64),
  booking_id UUID,
  property_title_snapshot VARCHAR(200),
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  is_read BOOLEAN,
  action_required BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
BEGIN
  IF (p_cursor_created_at IS NULL) <> (p_cursor_id IS NULL) THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_CURSOR';
  END IF;

  RETURN QUERY
  SELECT
    n.id,
    n.event_type,
    n.booking_id,
    n.property_title_snapshot,
    n.created_at,
    n.read_at,
    (n.read_at IS NOT NULL),
    COALESCE(
      n.event_type = 'BOOKING_APPROVED_PENDING_PAYMENT' AND b.status = 'APPROVED_PENDING_PAYMENT',
      false
    )
  FROM public.customer_notifications AS n
  LEFT JOIN public.bookings AS b ON b.id = n.booking_id
  WHERE n.customer_id = p_customer_id
    AND (
      p_cursor_created_at IS NULL
      OR (n.created_at, n.id) < (p_cursor_created_at, p_cursor_id)
    )
  ORDER BY n.created_at DESC, n.id DESC
  LIMIT v_limit + 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.konfrm_count_customer_unread_notifications(
  p_customer_id UUID
)
RETURNS TABLE (unread_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::BIGINT
  FROM public.customer_notifications
  WHERE customer_id = p_customer_id
    AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.konfrm_mark_customer_notification_read(
  p_customer_id UUID,
  p_notification_id UUID
)
RETURNS TABLE (notification_id UUID, read_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.customer_notifications
     SET read_at = COALESCE(read_at, NOW())
   WHERE customer_id = p_customer_id
     AND id = p_notification_id
  RETURNING id, read_at;
$$;

REVOKE ALL ON TABLE public.customer_notifications FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.konfrm_create_customer_notification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.konfrm_list_customer_notifications(UUID, INTEGER, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.konfrm_count_customer_unread_notifications(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.konfrm_mark_customer_notification_read(UUID, UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.konfrm_list_customer_notifications(UUID, INTEGER, TIMESTAMPTZ, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.konfrm_count_customer_unread_notifications(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.konfrm_mark_customer_notification_read(UUID, UUID) TO service_role;

INSERT INTO public.schema_migrations (version)
VALUES ('033_customer_notifications.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;
