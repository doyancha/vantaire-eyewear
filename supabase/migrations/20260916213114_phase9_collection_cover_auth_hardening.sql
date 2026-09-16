-- ==============================================================================
-- VANTAIRE EYEWEAR v1.3 — PHASE 9 CLOSURE: COLLECTION COVER AUTH HARDENING
-- ==============================================================================
-- Migration: 20260916213114_phase9_collection_cover_auth_hardening.sql
-- Description:
--   Removes deprecated auth.role() usage from fn_guard_collection_cover_storage_path.
--   Replaces with secure auth.uid() check to ensure authenticated users (Admin, Owner,
--   Outsider) cannot write legacy static seed paths (/images/collections/...) while
--   preserving deterministic local seed / service_role / postgres reset compatibility.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_guard_collection_cover_storage_path()
RETURNS trigger AS $$
DECLARE
  v_expected_prefix text;
  v_filename text;
  v_user_id uuid;
BEGIN
  -- If cover_image is NULL, allow (null draft state)
  IF NEW.cover_image IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prohibit path traversal, backslashes, protocols, and products prefix
  IF strpos(NEW.cover_image, '..') > 0 OR
     strpos(NEW.cover_image, '\') > 0 OR
     NEW.cover_image ~* '^https?://' OR
     NEW.cover_image LIKE 'products/%' THEN
    RAISE EXCEPTION 'Invalid cover_image: prohibited sequence, protocol, or product path'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Check legacy seed path: /images/collections/...
  IF NEW.cover_image LIKE '/images/collections/%' THEN
    -- Determine auth user id safely without deprecated auth.role()
    BEGIN
      v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    -- Authenticated client roles (Admin, Owner, Outsider) cannot set static seed paths
    IF v_user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Authenticated users cannot set static seed paths for cover_image'
        USING ERRCODE = 'check_violation';
    END IF;

    -- For seed/service_role/postgres (where auth.uid() IS NULL), allow legacy seed path
    RETURN NEW;
  END IF;

  -- For any non-seed path, leading slash is forbidden
  IF NEW.cover_image LIKE '/%' THEN
    RAISE EXCEPTION 'Invalid cover_image: leading slashes not allowed'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Must start with collections/{slug}/
  v_expected_prefix := 'collections/' || NEW.slug || '/';

  IF NOT (NEW.cover_image LIKE (v_expected_prefix || '%')) THEN
    RAISE EXCEPTION 'cover_image must start with %', v_expected_prefix
      USING ERRCODE = 'check_violation';
  END IF;

  v_filename := substr(NEW.cover_image, length(v_expected_prefix) + 1);

  IF v_filename LIKE '%/%' THEN
    RAISE EXCEPTION 'cover_image cannot have nested subdirectories'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Allowed formats:
  -- Baseline Phase 4: cover-[a-f0-9]{12,16}.(jpg|jpeg|png|webp)
  -- Phase 9: cover-[a-f0-9]{12,64}.(jpg|jpeg|png|webp)
  IF NOT (v_filename ~* '^cover-[a-f0-9]{12,64}\.(jpe?g|png|webp)$') THEN
    RAISE EXCEPTION 'cover_image filename must match cover-{hex}.{ext} format'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_guard_collection_cover_storage_path ON public.collections;
CREATE TRIGGER trg_guard_collection_cover_storage_path
  BEFORE INSERT OR UPDATE OF cover_image, slug ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_collection_cover_storage_path();
