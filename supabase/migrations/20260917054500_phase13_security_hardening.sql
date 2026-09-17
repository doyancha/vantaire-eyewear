-- ==============================================================================
-- VANTAIRE EYEWEAR v1.3 — PHASE 13
-- Migration: 20260917054500_phase13_security_hardening.sql
-- Description:
--   1. Create unexposed 'private' schema and revoke all public/anon access.
--   2. Move SECURITY DEFINER RBAC helpers (is_admin, is_owner, get_admin_role,
--      prevent_last_owner_removal) into 'private' schema with search_path = ''.
--   3. Update all table RLS policies to use private.is_admin() and private.is_owner().
--   4. Update storage.objects policies to use private.is_admin() and enforce strict
--      canonical CMS path patterns (no traversal, no backslashes, no leading slash).
--   5. Update all public RPC functions to reference private.is_admin().
--   6. Revoke public/anon execute on all public RPC functions.
--   7. Alter default privileges to prevent automatic PUBLIC execute on new functions.
--   8. Safely drop obsolete public-schema SECURITY DEFINER helper functions.
-- ==============================================================================

-- 1. CREATE UNEXPOSED PRIVATE SCHEMA & RESTRICT ACCESS
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2. CREATE RBAC SECURITY DEFINER HELPERS IN PRIVATE SCHEMA
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE id = (SELECT auth.uid())
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.is_owner()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.get_admin_role()
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.admin_profiles
  WHERE id = (SELECT auth.uid());
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION private.prevent_last_owner_removal()
RETURNS trigger AS $$
DECLARE
  owner_count integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'owner' AND NEW.role <> 'owner' THEN
      SELECT count(*) INTO owner_count
      FROM public.admin_profiles
      WHERE role = 'owner';

      IF owner_count <= 1 THEN
        RAISE EXCEPTION 'Cannot demote the last remaining owner account'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'owner' THEN
      SELECT count(*) INTO owner_count
      FROM public.admin_profiles
      WHERE role = 'owner';

      IF owner_count <= 1 THEN
        RAISE EXCEPTION 'Cannot delete the last remaining owner account'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_admin_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.prevent_last_owner_removal() TO authenticated, service_role;

-- 3. UPDATE TRIGGER ON ADMIN_PROFILES
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_admin_profiles_last_owner ON public.admin_profiles;
DROP TRIGGER IF EXISTS trg_prevent_last_owner_removal ON public.admin_profiles;
CREATE TRIGGER trg_admin_profiles_last_owner
  BEFORE UPDATE OR DELETE ON public.admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.prevent_last_owner_removal();

-- 4. UPDATE ALL RLS POLICIES IN PUBLIC SCHEMA
-- ------------------------------------------------------------------------------

-- Admin Profiles policies
DROP POLICY IF EXISTS admin_profiles_select_owner ON public.admin_profiles;
CREATE POLICY admin_profiles_select_owner
  ON public.admin_profiles FOR SELECT
  TO authenticated
  USING (private.is_owner());

DROP POLICY IF EXISTS admin_profiles_insert_owner ON public.admin_profiles;
CREATE POLICY admin_profiles_insert_owner
  ON public.admin_profiles FOR INSERT
  TO authenticated
  WITH CHECK (private.is_owner());

DROP POLICY IF EXISTS admin_profiles_update_owner ON public.admin_profiles;
CREATE POLICY admin_profiles_update_owner
  ON public.admin_profiles FOR UPDATE
  TO authenticated
  USING (private.is_owner())
  WITH CHECK (private.is_owner());

DROP POLICY IF EXISTS admin_profiles_delete_owner ON public.admin_profiles;
CREATE POLICY admin_profiles_delete_owner
  ON public.admin_profiles FOR DELETE
  TO authenticated
  USING (private.is_owner());

-- Products policies
DROP POLICY IF EXISTS products_select_admin ON public.products;
CREATE POLICY products_select_admin
  ON public.products FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS products_insert_admin ON public.products;
CREATE POLICY products_insert_admin
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (private.is_admin() AND is_active = false);

DROP POLICY IF EXISTS products_update_admin ON public.products;
CREATE POLICY products_update_admin
  ON public.products FOR UPDATE
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- Collections policies
DROP POLICY IF EXISTS collections_select_admin ON public.collections;
CREATE POLICY collections_select_admin
  ON public.collections FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS collections_insert_admin ON public.collections;
CREATE POLICY collections_insert_admin
  ON public.collections FOR INSERT
  TO authenticated
  WITH CHECK (private.is_admin() AND is_active = false);

DROP POLICY IF EXISTS collections_update_admin ON public.collections;
CREATE POLICY collections_update_admin
  ON public.collections FOR UPDATE
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- Product Collections policies
DROP POLICY IF EXISTS product_collections_select_admin ON public.product_collections;
CREATE POLICY product_collections_select_admin
  ON public.product_collections FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS product_collections_insert_admin ON public.product_collections;
CREATE POLICY product_collections_insert_admin
  ON public.product_collections FOR INSERT
  TO authenticated
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS product_collections_update_admin ON public.product_collections;
CREATE POLICY product_collections_update_admin
  ON public.product_collections FOR UPDATE
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS product_collections_delete_admin ON public.product_collections;
CREATE POLICY product_collections_delete_admin
  ON public.product_collections FOR DELETE
  TO authenticated
  USING (private.is_admin());

-- Product Images policies
DROP POLICY IF EXISTS product_images_select_admin ON public.product_images;
CREATE POLICY product_images_select_admin
  ON public.product_images FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS product_images_insert_admin ON public.product_images;
CREATE POLICY product_images_insert_admin
  ON public.product_images FOR INSERT
  TO authenticated
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS product_images_update_admin ON public.product_images;
CREATE POLICY product_images_update_admin
  ON public.product_images FOR UPDATE
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS product_images_delete_admin ON public.product_images;
CREATE POLICY product_images_delete_admin
  ON public.product_images FOR DELETE
  TO authenticated
  USING (private.is_admin());

-- Site Settings policies
DROP POLICY IF EXISTS site_settings_select_admin ON public.site_settings;
CREATE POLICY site_settings_select_admin
  ON public.site_settings FOR SELECT
  TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS site_settings_update_admin ON public.site_settings;
CREATE POLICY site_settings_update_admin
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin() AND id = 1);

-- 5. UPDATE STORAGE POLICIES & HARDEN PATHS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin and Owner can select product-media objects" ON storage.objects;
CREATE POLICY "Admin and Owner can select product-media objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'product-media' AND private.is_admin());

DROP POLICY IF EXISTS "Admin and Owner can insert product-media objects" ON storage.objects;
CREATE POLICY "Admin and Owner can insert product-media objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-media'
    AND private.is_admin()
    AND (
      name ~* '^(products|collections)/[a-z0-9-]+/(primary-[a-f0-9]{12,64}|image-[a-f0-9]{12,64}|cover-[a-f0-9]{12,64}|image-orphan-[a-z0-9_.-]+)\.(jpe?g|png|webp)$'
      OR name ~* '^tests/phase4/[a-z0-9_.-]+\.(jpe?g|png|webp)$'
    )
    AND name NOT LIKE '%..%'
    AND name NOT LIKE '%\%'
    AND name NOT LIKE '/%'
  );

DROP POLICY IF EXISTS "Admin and Owner can update product-media objects" ON storage.objects;
CREATE POLICY "Admin and Owner can update product-media objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-media'
    AND private.is_admin()
    AND (
      name ~* '^(products|collections)/[a-z0-9-]+/(primary-[a-f0-9]{12,64}|image-[a-f0-9]{12,64}|cover-[a-f0-9]{12,64}|image-orphan-[a-z0-9_.-]+)\.(jpe?g|png|webp)$'
      OR name ~* '^tests/phase4/[a-z0-9_.-]+\.(jpe?g|png|webp)$'
    )
    AND name NOT LIKE '%..%'
    AND name NOT LIKE '%\%'
    AND name NOT LIKE '/%'
  )
  WITH CHECK (
    bucket_id = 'product-media'
    AND private.is_admin()
    AND (
      name ~* '^(products|collections)/[a-z0-9-]+/(primary-[a-f0-9]{12,64}|image-[a-f0-9]{12,64}|cover-[a-f0-9]{12,64}|image-orphan-[a-z0-9_.-]+)\.(jpe?g|png|webp)$'
      OR name ~* '^tests/phase4/[a-z0-9_.-]+\.(jpe?g|png|webp)$'
    )
    AND name NOT LIKE '%..%'
    AND name NOT LIKE '%\%'
    AND name NOT LIKE '/%'
  );

DROP POLICY IF EXISTS "Admin and Owner can delete product-media objects" ON storage.objects;
CREATE POLICY "Admin and Owner can delete product-media objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-media' AND private.is_admin());

-- 6. UPDATE PUBLIC RPCS TO USE PRIVATE.IS_ADMIN()
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_product_primary_image(p_product_id uuid, p_image_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM 1 FROM public.products WHERE id = p_product_id FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1 FROM public.product_images
    WHERE id = p_image_id AND product_id = p_product_id
  ) THEN
    RAISE EXCEPTION 'Image not found for this product'
      USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE public.product_images
  SET is_primary = false
  WHERE product_id = p_product_id AND is_primary = true AND id <> p_image_id;

  UPDATE public.product_images
  SET is_primary = true
  WHERE product_id = p_product_id AND id = p_image_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_product_images(p_product_id uuid, p_image_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_count integer;
  v_distinct_count integer;
  v_actual_count integer;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_count := array_length(p_image_ids, 1);
  IF v_count IS NULL OR v_count = 0 THEN
    RAISE EXCEPTION 'Image ID array cannot be empty'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(DISTINCT u) INTO v_distinct_count
  FROM unnest(p_image_ids) AS u;

  IF v_distinct_count <> v_count THEN
    RAISE EXCEPTION 'Duplicate image IDs found in reorder array'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO v_actual_count
  FROM public.product_images
  WHERE product_id = p_product_id AND id = ANY(p_image_ids);

  IF v_actual_count <> v_count THEN
    RAISE EXCEPTION 'One or more image IDs do not belong to the specified product'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.product_images pi
  SET sort_order = ord.idx - 1
  FROM unnest(p_image_ids) WITH ORDINALITY AS ord(id, idx)
  WHERE pi.id = ord.id AND pi.product_id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_product_image_metadata(p_product_id uuid, p_image_id uuid)
RETURNS TABLE(deleted_storage_path text, promoted_image_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_is_active boolean;
  v_deleted_path text;
  v_was_primary boolean;
  v_total_images integer;
  v_promoted_id uuid := NULL;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT is_active INTO v_is_active
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF v_is_active IS NULL THEN
    RAISE EXCEPTION 'Product not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  SELECT storage_path, is_primary INTO v_deleted_path, v_was_primary
  FROM public.product_images
  WHERE id = p_image_id AND product_id = p_product_id;

  IF v_deleted_path IS NULL THEN
    RAISE EXCEPTION 'Image not found for this product'
      USING ERRCODE = 'no_data_found';
  END IF;

  SELECT count(*) INTO v_total_images
  FROM public.product_images
  WHERE product_id = p_product_id;

  IF v_is_active = true AND v_total_images <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the only image of an active product. Deactivate product first or add another image.'
      USING ERRCODE = 'check_violation';
  END IF;

  DELETE FROM public.product_images
  WHERE id = p_image_id AND product_id = p_product_id;

  IF v_was_primary = true AND v_total_images > 1 THEN
    SELECT id INTO v_promoted_id
    FROM public.product_images
    WHERE product_id = p_product_id
    ORDER BY sort_order ASC, created_at ASC
    LIMIT 1;

    IF v_promoted_id IS NOT NULL THEN
      UPDATE public.product_images
      SET is_primary = true
      WHERE id = v_promoted_id;
    END IF;
  END IF;

  RETURN QUERY SELECT v_deleted_path, v_promoted_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_collection_products(
  p_collection_id uuid,
  p_product_ids uuid[],
  p_expected_updated_at timestamptz
)
RETURNS TABLE(
  collection_id uuid,
  updated_at timestamptz,
  member_count integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_current_updated_at timestamptz;
  v_is_active boolean;
  v_arr_length integer;
  v_distinct_count integer;
  v_valid_product_count integer;
  v_active_prod_count integer;
  v_new_updated_at timestamptz;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_expected_updated_at IS NULL THEN
    RAISE EXCEPTION 'Concurrency token (expected_updated_at) is mandatory'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT c.updated_at, c.is_active
  INTO v_current_updated_at, v_is_active
  FROM public.collections c
  WHERE c.id = p_collection_id
  FOR UPDATE;

  IF v_current_updated_at IS NULL THEN
    RAISE EXCEPTION 'Collection not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF date_trunc('milliseconds', v_current_updated_at) <> date_trunc('milliseconds', p_expected_updated_at) THEN
    RAISE EXCEPTION 'Conflict: Collection was modified by another transaction'
      USING ERRCODE = 'check_violation';
  END IF;

  v_arr_length := COALESCE(array_length(p_product_ids, 1), 0);

  IF v_is_active = true AND v_arr_length = 0 THEN
    RAISE EXCEPTION 'Cannot remove all products from an active collection'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_arr_length > 0 THEN
    IF EXISTS (SELECT 1 FROM unnest(p_product_ids) AS u WHERE u IS NULL) THEN
      RAISE EXCEPTION 'Product IDs array cannot contain nulls'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT count(DISTINCT u) INTO v_distinct_count
    FROM unnest(p_product_ids) AS u;

    IF v_distinct_count <> v_arr_length THEN
      RAISE EXCEPTION 'Duplicate product IDs found in assignment array'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT count(*) INTO v_valid_product_count
    FROM public.products p
    WHERE p.id = ANY(p_product_ids);

    IF v_valid_product_count <> v_arr_length THEN
      RAISE EXCEPTION 'One or more specified products do not exist'
        USING ERRCODE = 'foreign_key_violation';
    END IF;

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

  DELETE FROM public.product_collections pc WHERE pc.collection_id = p_collection_id;

  IF v_arr_length > 0 THEN
    INSERT INTO public.product_collections (product_id, collection_id, position)
    SELECT ord.prod_id, p_collection_id, (ord.idx - 1)::integer
    FROM unnest(p_product_ids) WITH ORDINALITY AS ord(prod_id, idx);
  END IF;

  UPDATE public.collections c
  SET updated_at = clock_timestamp()
  WHERE c.id = p_collection_id
  RETURNING c.updated_at INTO v_new_updated_at;

  RETURN QUERY SELECT p_collection_id, v_new_updated_at, v_arr_length;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_products(
  p_ordered_ids uuid[],
  p_expected_order uuid[] DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  total_reordered integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_total_count integer;
  v_req_count integer;
  v_dist_count integer;
  v_valid_count integer;
  v_current_order uuid[];
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM pg_advisory_xact_lock(7421001);

  IF p_expected_order IS NULL THEN
    RAISE EXCEPTION 'Expected product order snapshot is mandatory for concurrency protection'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO v_total_count FROM public.products;
  v_req_count := COALESCE(array_length(p_ordered_ids, 1), 0);

  IF v_req_count <> v_total_count THEN
    RAISE EXCEPTION 'Reorder array must contain exactly all % products (provided: %)',
      v_total_count, v_req_count
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (SELECT 1 FROM unnest(p_ordered_ids) AS u WHERE u IS NULL) THEN
    RAISE EXCEPTION 'Product ID array cannot contain NULL values'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(DISTINCT u) INTO v_dist_count
  FROM unnest(p_ordered_ids) AS u;

  IF v_dist_count <> v_total_count THEN
    RAISE EXCEPTION 'Duplicate product IDs found in reorder array'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO v_valid_count
  FROM public.products p
  WHERE p.id = ANY(p_ordered_ids);

  IF v_valid_count <> v_total_count THEN
    RAISE EXCEPTION 'One or more specified product IDs do not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT array_agg(p.id ORDER BY p.sort_order ASC)
  INTO v_current_order
  FROM public.products p;

  IF v_current_order IS DISTINCT FROM p_expected_order THEN
    RAISE EXCEPTION 'Conflict: Product order has changed in another session'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.products p
  SET sort_order = (ord.idx - 1)::integer,
      updated_at = clock_timestamp()
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS ord(id, idx)
  WHERE p.id = ord.id;

  RETURN QUERY SELECT true, v_total_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_collections(
  p_ordered_ids uuid[],
  p_expected_order uuid[] DEFAULT NULL
)
RETURNS TABLE (
  success boolean,
  total_reordered integer
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $$
DECLARE
  v_total_count integer;
  v_req_count integer;
  v_dist_count integer;
  v_valid_count integer;
  v_current_order uuid[];
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM pg_advisory_xact_lock(7421002);

  IF p_expected_order IS NULL THEN
    RAISE EXCEPTION 'Expected collection order snapshot is mandatory for concurrency protection'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO v_total_count FROM public.collections;
  v_req_count := COALESCE(array_length(p_ordered_ids, 1), 0);

  IF v_req_count <> v_total_count THEN
    RAISE EXCEPTION 'Reorder array must contain exactly all % collections (provided: %)',
      v_total_count, v_req_count
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (SELECT 1 FROM unnest(p_ordered_ids) AS u WHERE u IS NULL) THEN
    RAISE EXCEPTION 'Collection ID array cannot contain NULL values'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(DISTINCT u) INTO v_dist_count
  FROM unnest(p_ordered_ids) AS u;

  IF v_dist_count <> v_total_count THEN
    RAISE EXCEPTION 'Duplicate collection IDs found in reorder array'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO v_valid_count
  FROM public.collections c
  WHERE c.id = ANY(p_ordered_ids);

  IF v_valid_count <> v_total_count THEN
    RAISE EXCEPTION 'One or more specified collection IDs do not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT array_agg(c.id ORDER BY c.sort_order ASC)
  INTO v_current_order
  FROM public.collections c;

  IF v_current_order IS DISTINCT FROM p_expected_order THEN
    RAISE EXCEPTION 'Conflict: Collection order has changed in another session'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.collections c
  SET sort_order = (ord.idx - 1)::integer,
      updated_at = clock_timestamp()
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS ord(id, idx)
  WHERE c.id = ord.id;

  RETURN QUERY SELECT true, v_total_count;
END;
$$;

-- Revoke public/anon execute on public RPC functions
REVOKE ALL ON FUNCTION public.set_product_primary_image(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_product_primary_image(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reorder_product_images(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_product_images(uuid, uuid[]) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.remove_product_image_metadata(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_product_image_metadata(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_collection_products(uuid, uuid[], timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_collection_products(uuid, uuid[], timestamptz) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reorder_products(uuid[], uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_products(uuid[], uuid[]) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.reorder_collections(uuid[], uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_collections(uuid[], uuid[]) TO authenticated, service_role;

-- 7. DEFAULT FUNCTION PRIVILEGES HARDENING
-- ------------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 8. DROP OBSOLETE PUBLIC SECURITY DEFINER HELPERS
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_owner() CASCADE;
DROP FUNCTION IF EXISTS public.get_admin_role() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_last_owner_removal() CASCADE;
