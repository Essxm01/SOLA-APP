-- P1.3 — atomic property-media commit (prepared locally only; unapplied).
--
-- This replaces the Worker-unsafe two-write sequence with one PostgreSQL
-- transaction. It must be applied only after the separately approved
-- duplicate-active-image preflight described in the P1.3 report.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS property_images_one_active_per_upload_intent_idx
  ON public.property_images (upload_intent_id)
  WHERE upload_intent_id IS NOT NULL AND status = 'ACTIVE';

CREATE OR REPLACE FUNCTION public.konfrm_commit_property_media(
  p_upload_intent_id uuid,
  p_owner_id uuid,
  p_property_id uuid,
  p_object_key text,
  p_file_url text,
  p_file_name text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_sort_order integer,
  p_sha256_checksum text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  "propertyId" uuid,
  "ownerId" uuid,
  "objectKey" text,
  "fileUrl" text,
  "fileName" text,
  "mimeType" text,
  "fileSize" bigint,
  "sortOrder" integer,
  "uploadIntentId" uuid,
  "sha256Checksum" text,
  status text,
  "uploadedAt" timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_intent public.upload_intents%ROWTYPE;
  v_image public.property_images%ROWTYPE;
BEGIN
  -- Lock the intent first. Every valid commit for this id serializes here.
  -- Table aliases keep every column reference qualified: the RETURNS TABLE
  -- outputs "id" and "status" are PL/pgSQL variables, and an unqualified
  -- column reference would be an ambiguous-name runtime error.
  SELECT ui.* INTO v_intent
  FROM public.upload_intents ui
  WHERE ui.id = p_upload_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'UPLOAD_INTENT_NOT_FOUND';
  END IF;

  IF v_intent.owner_id <> p_owner_id
     OR v_intent.property_id <> p_property_id
     OR v_intent.object_key <> p_object_key THEN
    RAISE EXCEPTION 'PROPERTY_MEDIA_COMMIT_BINDING_MISMATCH';
  END IF;

  -- Then lock/read the one canonical active image, if any. A replay is valid
  -- only when the intent and image agree; inconsistent half-states fail.
  SELECT pi.* INTO v_image
  FROM public.property_images pi
  WHERE pi.upload_intent_id = p_upload_intent_id
    AND pi.status = 'ACTIVE'
  FOR UPDATE;

  IF FOUND THEN
    IF v_image.owner_id <> p_owner_id
       OR v_image.property_id <> p_property_id
       OR v_image.object_key <> p_object_key THEN
      RAISE EXCEPTION 'PROPERTY_MEDIA_COMMIT_BINDING_MISMATCH';
    END IF;
    IF v_intent.status <> 'COMMITTED' THEN
      RAISE EXCEPTION 'MEDIA_COMMIT_INCONSISTENT';
    END IF;
    RETURN QUERY SELECT v_image.id, v_image.property_id, v_image.owner_id,
      v_image.object_key, v_image.file_url, v_image.file_name::text, v_image.mime_type::text,
      v_image.file_size_bytes, v_image.sort_order, v_image.upload_intent_id,
      v_image.sha256_checksum::text, v_image.status::text, v_image.uploaded_at;
    RETURN;
  END IF;

  IF v_intent.status = 'COMMITTED' THEN
    RAISE EXCEPTION 'MEDIA_COMMIT_INCONSISTENT';
  END IF;
  IF v_intent.status <> 'PENDING_UPLOAD' THEN
    RAISE EXCEPTION 'UPLOAD_INTENT_NOT_PENDING';
  END IF;
  IF v_intent.expires_at <= NOW() THEN
    RAISE EXCEPTION 'UPLOAD_INTENT_EXPIRED';
  END IF;
  IF v_intent.expected_mime_type <> p_mime_type
     OR v_intent.expected_size_bytes <> p_file_size_bytes THEN
    RAISE EXCEPTION 'UPLOAD_INTENT_FILE_METADATA_MISMATCH';
  END IF;

  PERFORM 1
  FROM public.properties p
  WHERE p.id = p_property_id
    AND p.owner_id = p_owner_id
    AND p.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROPERTY_OWNER_SCOPE_NOT_FOUND';
  END IF;

  INSERT INTO public.property_images (
    property_id, owner_id, object_key, file_url, file_name, mime_type,
    file_size_bytes, sort_order, upload_intent_id, sha256_checksum, status
  ) VALUES (
    p_property_id, p_owner_id, p_object_key, p_file_url, p_file_name, p_mime_type,
    p_file_size_bytes, COALESCE(p_sort_order, 0), p_upload_intent_id,
    p_sha256_checksum, 'ACTIVE'
  )
  RETURNING * INTO v_image;

  -- SET's left side is a target-column name position and must stay unqualified;
  -- every WHERE reference is alias-qualified against the same ambiguity.
  UPDATE public.upload_intents ui
  SET status = 'COMMITTED'
  WHERE ui.id = p_upload_intent_id
    AND ui.status = 'PENDING_UPLOAD'
    AND ui.expires_at > NOW();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'UPLOAD_INTENT_COMMIT_CONFLICT';
  END IF;

  RETURN QUERY SELECT v_image.id, v_image.property_id, v_image.owner_id,
    v_image.object_key, v_image.file_url, v_image.file_name::text, v_image.mime_type::text,
    v_image.file_size_bytes, v_image.sort_order, v_image.upload_intent_id,
    v_image.sha256_checksum::text, v_image.status::text, v_image.uploaded_at;
END;
$$;

REVOKE ALL ON FUNCTION public.konfrm_commit_property_media(
  uuid, uuid, uuid, text, text, text, text, bigint, integer, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.konfrm_commit_property_media(
  uuid, uuid, uuid, text, text, text, text, bigint, integer, text
) TO service_role;

INSERT INTO public.schema_migrations (version)
VALUES ('024_atomic_property_media_commit.sql')
ON CONFLICT (version) DO NOTHING;

COMMIT;
