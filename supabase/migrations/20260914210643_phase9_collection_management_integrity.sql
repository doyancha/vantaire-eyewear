-- ==============================================================================
-- VANTAIRE EYEWEAR v1.3 — PHASE 9: COLLECTION MANAGEMENT INTEGRITY & MEMBERSHIP
-- ==============================================================================
-- Migration: 20260914210643_phase9_collection_management_integrity.sql
-- Description:
--   1. Hard-delete hardening: Revoke DELETE on collections and drop delete policy.
--   2. Inactive-only insert policy: collections_insert_admin enforces is_active = false.
--   3. Nullable cover_image for drafts with updated check constraint.
--   4. Immutable collection slug trigger (fn_prevent_collection_slug_mutation).
--   5. Collection cover storage path validation trigger (fn_guard_collection_cover_storage_path).
--   6. Collection activation guard trigger (fn_guard_collection_activation).
--   7. Product deactivation guard trigger (fn_guard_product_deactivation_collection_members).
--   8. Unique deferrable constraint on product_collections (collection_id, position).
--   9. Parent collection lock trigger for serialized membership mutations.
--  10. Contiguous position and active membership constraint trigger (fn_enforce_collection_positions_contiguous).
--  11. Atomic transactional membership RPC: public.set_collection_products.
--  12. Grant / revoke execute permissions on RPC function.
-- ==============================================================================

-- 1. HARD-DELETE RESTRICTIONS ON COLLECTIONS
-- ------------------------------------------------------------------------------
-- Drop admin delete policy on collections
DROP POLICY IF EXISTS "collections_delete_admin" ON public.collections;

-- Explicitly revoke DELETE privilege on collections table from client roles
REVOKE DELETE ON public.collections FROM authenticated, anon, public;


-- 2. TIGHTEN COLLECTIONS INSERT POLICY (INACTIVE DRAFTS ONLY)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "collections_insert_admin" ON public.collections;
CREATE POLICY "collections_insert_admin"
ON public.collections
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() AND is_active = false);


-- 3. COVER_IMAGE NULLABILITY & VALIDATION CONSTRAINT FOR DRAFTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.collections ALTER COLUMN cover_image DROP NOT NULL;
ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS chk_collections_cover_image_not_blank;
ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS chk_collections_cover_image_valid;
ALTER TABLE public.collections ADD CONSTRAINT chk_collections_cover_image_valid
  CHECK (cover_image IS NULL OR length(trim(cover_image)) > 0);


-- 4. PREVENT COLLECTION SLUG MUTATION TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_prevent_collection_slug_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD.slug IS DISTINCT FROM NEW.slug THEN
    RAISE EXCEPTION 'Collection slug is immutable once created'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_prevent_collection_slug_mutation ON public.collections;
CREATE TRIGGER trg_prevent_collection_slug_mutation
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_collection_slug_mutation();


-- 5. COLLECTION COVER STORAGE PATH VALIDATION TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_collection_cover_storage_path()
RETURNS trigger AS $$
DECLARE
  v_expected_prefix text;
  v_filename text;
  v_auth_role text;
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
    -- Determine auth role safely
    BEGIN
      v_auth_role := auth.role();
    EXCEPTION WHEN OTHERS THEN
      v_auth_role := NULL;
    END;

    -- Authenticated client roles (Admin, Owner, Outsider) cannot set static seed paths
    IF v_auth_role = 'authenticated' THEN
      RAISE EXCEPTION 'Authenticated users cannot set static seed paths for cover_image'
        USING ERRCODE = 'check_violation';
    END IF;

    -- For seed/service_role/postgres, allow legacy seed path
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


-- 6. COLLECTION ACTIVATION GUARD TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_collection_activation()
RETURNS trigger AS $$
DECLARE
  v_prod_count integer;
  v_active_prod_count integer;
BEGIN
  -- An active collection must always have a non-empty cover_image
  IF NEW.is_active = true THEN
    IF NEW.cover_image IS NULL OR length(trim(NEW.cover_image)) = 0 THEN
      RAISE EXCEPTION 'Active collection must have a cover image'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Guard activating inactive collections: must have at least 1 product and at least 1 active product
  IF NEW.is_active = true AND (OLD.is_active = false OR OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    SELECT count(*), count(*) FILTER (WHERE p.is_active = true)
    INTO v_prod_count, v_active_prod_count
    FROM public.product_collections pc
    JOIN public.products p ON p.id = pc.product_id
    WHERE pc.collection_id = NEW.id;

    IF v_prod_count = 0 THEN
      RAISE EXCEPTION 'Cannot activate collection without at least one assigned product'
        USING ERRCODE = 'check_violation';
    END IF;

    IF v_active_prod_count = 0 THEN
      RAISE EXCEPTION 'Cannot activate collection without at least one active product'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_guard_collection_activation ON public.collections;
CREATE TRIGGER trg_guard_collection_activation
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_collection_activation();


-- 7. PRODUCT DEACTIVATION GUARD FOR ACTIVE COLLECTION MEMBERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_product_deactivation_collection_members()
RETURNS trigger AS $$
DECLARE
  v_empty_col_id uuid;
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    -- Check if deactivating this product leaves any active collection with zero active products
    SELECT c.id INTO v_empty_col_id
    FROM public.collections c
    WHERE c.is_active = true
      AND EXISTS (
        SELECT 1 FROM public.product_collections pc
        WHERE pc.collection_id = c.id AND pc.product_id = NEW.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.product_collections pc
        JOIN public.products p ON p.id = pc.product_id
        WHERE pc.collection_id = c.id
          AND pc.product_id <> NEW.id
          AND p.is_active = true
      )
    LIMIT 1;

    IF v_empty_col_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot deactivate product: active collection % would be left with zero active products', v_empty_col_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_guard_product_deactivation_collection_members ON public.products;
CREATE TRIGGER trg_guard_product_deactivation_collection_members
  BEFORE UPDATE OF is_active ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_product_deactivation_collection_members();


-- 8. UNIQUE DEFERRABLE CONSTRAINT ON PRODUCT_COLLECTIONS
-- ------------------------------------------------------------------------------
ALTER TABLE public.product_collections DROP CONSTRAINT IF EXISTS uq_product_collections_col_pos;
ALTER TABLE public.product_collections
  ADD CONSTRAINT uq_product_collections_col_pos
  UNIQUE (collection_id, position)
  DEFERRABLE INITIALLY DEFERRED;


-- 9. PARENT COLLECTION LOCK TRIGGER FOR SERIALIZED MEMBERSHIP MUTATIONS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_lock_parent_collection_for_membership()
RETURNS trigger AS $$
DECLARE
  v_coll_id uuid;
BEGIN
  v_coll_id := COALESCE(NEW.collection_id, OLD.collection_id);
  PERFORM 1 FROM public.collections WHERE id = v_coll_id FOR UPDATE;

  IF TG_OP = 'UPDATE' AND OLD.collection_id IS DISTINCT FROM NEW.collection_id THEN
    PERFORM 1 FROM public.collections WHERE id = OLD.collection_id FOR UPDATE;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_lock_parent_collection_for_membership ON public.product_collections;
CREATE TRIGGER trg_lock_parent_collection_for_membership
  BEFORE INSERT OR UPDATE OR DELETE ON public.product_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_lock_parent_collection_for_membership();


-- 10. CONTIGUOUS POSITION AND ACTIVE MEMBERSHIP CONSTRAINT TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_enforce_collection_positions_contiguous()
RETURNS trigger AS $$
DECLARE
  v_coll_id uuid;
  v_cnt integer;
  v_min integer;
  v_max integer;
  v_dist_cnt integer;
  v_is_active boolean;
  v_active_prod_count integer;
BEGIN
  v_coll_id := COALESCE(NEW.collection_id, OLD.collection_id);

  -- Check if collection exists
  SELECT is_active INTO v_is_active
  FROM public.collections
  WHERE id = v_coll_id;

  IF v_is_active IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT count(*), min(position), max(position), count(DISTINCT position)
  INTO v_cnt, v_min, v_max, v_dist_cnt
  FROM public.product_collections
  WHERE collection_id = v_coll_id;

  IF v_cnt > 0 THEN
    IF v_min <> 0 OR v_max <> (v_cnt - 1) OR v_dist_cnt <> v_cnt THEN
      RAISE EXCEPTION 'Product positions in collection % must be contiguous starting from 0 (min: %, max: %, count: %, distinct: %)',
        v_coll_id, v_min, v_max, v_cnt, v_dist_cnt
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- An active collection must always contain at least one active product
  IF v_is_active = true THEN
    SELECT count(*)
    INTO v_active_prod_count
    FROM public.product_collections pc
    JOIN public.products p ON p.id = pc.product_id
    WHERE pc.collection_id = v_coll_id AND p.is_active = true;

    IF v_active_prod_count = 0 THEN
      RAISE EXCEPTION 'Active collection % must contain at least one active product', v_coll_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- If UPDATE changed collection_id, also check OLD.collection_id
  IF TG_OP = 'UPDATE' AND OLD.collection_id IS DISTINCT FROM NEW.collection_id THEN
    SELECT is_active INTO v_is_active FROM public.collections WHERE id = OLD.collection_id;
    IF v_is_active IS NOT NULL THEN
      SELECT count(*), min(position), max(position), count(DISTINCT position)
      INTO v_cnt, v_min, v_max, v_dist_cnt
      FROM public.product_collections
      WHERE collection_id = OLD.collection_id;

      IF v_cnt > 0 THEN
        IF v_min <> 0 OR v_max <> (v_cnt - 1) OR v_dist_cnt <> v_cnt THEN
          RAISE EXCEPTION 'Product positions in collection % must be contiguous starting from 0', OLD.collection_id
            USING ERRCODE = 'check_violation';
        END IF;
      END IF;

      IF v_is_active = true THEN
        SELECT count(*)
        INTO v_active_prod_count
        FROM public.product_collections pc
        JOIN public.products p ON p.id = pc.product_id
        WHERE pc.collection_id = OLD.collection_id AND p.is_active = true;

        IF v_active_prod_count = 0 THEN
          RAISE EXCEPTION 'Active collection % must contain at least one active product', OLD.collection_id
            USING ERRCODE = 'check_violation';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_enforce_collection_positions_contiguous ON public.product_collections;
CREATE CONSTRAINT TRIGGER trg_enforce_collection_positions_contiguous
  AFTER INSERT OR UPDATE OR DELETE ON public.product_collections
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_collection_positions_contiguous();


-- 11. ATOMIC TRANSACTIONAL MEMBERSHIP RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_collection_products(
  p_collection_id uuid,
  p_product_ids uuid[],
  p_expected_updated_at timestamptz
)
RETURNS TABLE (
  collection_id uuid,
  updated_at timestamptz,
  member_count integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_curr_updated_at timestamptz;
  v_is_active boolean;
  v_arr_length integer;
  v_distinct_count integer;
  v_valid_product_count integer;
  v_new_updated_at timestamptz;
  v_active_prod_count integer := 0;
BEGIN
  -- 1. Require admin role
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Lock collection row and check existence
  SELECT c.updated_at, c.is_active
  INTO v_curr_updated_at, v_is_active
  FROM public.collections c
  WHERE c.id = p_collection_id
  FOR UPDATE;

  IF v_curr_updated_at IS NULL THEN
    RAISE EXCEPTION 'Collection not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- 3. Optimistic concurrency check
  IF p_expected_updated_at IS NOT NULL AND v_curr_updated_at <> p_expected_updated_at THEN
    RAISE EXCEPTION 'Conflict: Collection was modified by another operation (expected %, current %)',
      p_expected_updated_at, v_curr_updated_at
      USING ERRCODE = 'check_violation';
  END IF;

  v_arr_length := COALESCE(array_length(p_product_ids, 1), 0);

  -- 4. Active collection requires at least 1 product
  IF v_is_active = true AND v_arr_length = 0 THEN
    RAISE EXCEPTION 'Active collection must contain at least one product'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. If products are provided, validate them
  IF v_arr_length > 0 THEN
    -- Check for NULLs
    IF EXISTS (SELECT 1 FROM unnest(p_product_ids) AS u WHERE u IS NULL) THEN
      RAISE EXCEPTION 'Product ID array cannot contain NULL values'
        USING ERRCODE = 'check_violation';
    END IF;

    -- Check for duplicates
    SELECT count(DISTINCT u) INTO v_distinct_count
    FROM unnest(p_product_ids) AS u;

    IF v_distinct_count <> v_arr_length THEN
      RAISE EXCEPTION 'Duplicate product IDs found in assignment array'
        USING ERRCODE = 'check_violation';
    END IF;

    -- Check all products exist in public.products
    SELECT count(*) INTO v_valid_product_count
    FROM public.products p
    WHERE p.id = ANY(p_product_ids);

    IF v_valid_product_count <> v_arr_length THEN
      RAISE EXCEPTION 'One or more specified products do not exist'
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- If collection is active, verify at least one assigned product is active
    IF v_is_active = true THEN
      SELECT count(*) INTO v_active_prod_count
      FROM public.products p
      WHERE p.id = ANY(p_product_ids) AND p.is_active = true;

      IF v_active_prod_count = 0 THEN
        RAISE EXCEPTION 'Active collection must contain at least one active product'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  -- 6. Replace full membership set
  DELETE FROM public.product_collections pc WHERE pc.collection_id = p_collection_id;

  IF v_arr_length > 0 THEN
    INSERT INTO public.product_collections (product_id, collection_id, position)
    SELECT ord.prod_id, p_collection_id, (ord.idx - 1)::integer
    FROM unnest(p_product_ids) WITH ORDINALITY AS ord(prod_id, idx);
  END IF;

  -- 7. Touch collection updated_at
  UPDATE public.collections c
  SET updated_at = clock_timestamp()
  WHERE c.id = p_collection_id
  RETURNING c.updated_at INTO v_new_updated_at;

  RETURN QUERY SELECT p_collection_id, v_new_updated_at, v_arr_length;
END;
$$;


-- 12. RPC FUNCTION PERMISSIONS
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.set_collection_products(uuid, uuid[], timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.set_collection_products(uuid, uuid[], timestamptz) FROM PUBLIC, anon;
