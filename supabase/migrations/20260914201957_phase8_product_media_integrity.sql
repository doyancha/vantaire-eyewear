-- ==============================================================================
-- VANTAIRE EYEWEAR v1.3 — PHASE 8: PRODUCT MEDIA INTEGRITY & RPC FUNCTIONS
-- ==============================================================================
-- 1. Tighten products_insert_admin policy: new products must be inactive drafts
-- 2. trg_guard_product_activation: block activating products without a primary image
-- 3. trg_guard_product_images_max_limit: enforce max 5 images per product with parent row lock
-- 4. trg_guard_product_image_storage_path: strictly validate storage path format and prefix
-- 5. trg_enforce_active_product_primary: deferrable constraint trigger enforcing exactly 1 primary image for active products
-- 6. RPC functions:
--    - public.set_product_primary_image(p_product_id uuid, p_image_id uuid)
--    - public.reorder_product_images(p_product_id uuid, p_image_ids uuid[])
--    - public.remove_product_image_metadata(p_product_id uuid, p_image_id uuid)
-- ==============================================================================

-- 1. TIGHTEN PRODUCTS INSERT POLICY
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "products_insert_admin" ON public.products;
CREATE POLICY "products_insert_admin"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin() AND is_active = false);


-- 2. PRODUCT ACTIVATION GUARD TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_product_activation()
RETURNS trigger AS $$
DECLARE
  v_img_count integer;
  v_primary_count integer;
BEGIN
  IF NEW.is_active = true AND (OLD.is_active = false OR OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    SELECT count(*), count(*) FILTER (WHERE is_primary = true)
    INTO v_img_count, v_primary_count
    FROM public.product_images
    WHERE product_id = NEW.id;

    IF v_img_count = 0 THEN
      RAISE EXCEPTION 'Cannot activate product without at least one image'
        USING ERRCODE = 'check_violation';
    END IF;

    IF v_primary_count <> 1 THEN
      RAISE EXCEPTION 'Cannot activate product without exactly one primary image'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_guard_product_activation ON public.products;
CREATE TRIGGER trg_guard_product_activation
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_product_activation();


-- 3. MAX 5 IMAGES PER PRODUCT TRIGGER (WITH PARENT ROW LOCK)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_product_images_max_limit()
RETURNS trigger AS $$
DECLARE
  v_count integer;
BEGIN
  -- Row lock parent product to serialize concurrent image uploads
  PERFORM 1 FROM public.products WHERE id = NEW.product_id FOR UPDATE;

  -- Skip count if updating within the same product
  IF TG_OP = 'UPDATE' AND OLD.product_id = NEW.product_id THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.product_images
  WHERE product_id = NEW.product_id;

  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Product cannot have more than 5 images'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_guard_product_images_max_limit ON public.product_images;
CREATE TRIGGER trg_guard_product_images_max_limit
  BEFORE INSERT OR UPDATE OF product_id ON public.product_images
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_product_images_max_limit();


-- 4. STORAGE PATH VALIDATION TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_product_image_storage_path()
RETURNS trigger AS $$
DECLARE
  v_slug text;
  v_expected_prefix text;
  v_filename text;
BEGIN
  -- Prohibit path traversal, backslashes, leading slashes, protocols, and collections prefix
  IF strpos(NEW.storage_path, '..') > 0 OR
     strpos(NEW.storage_path, '\') > 0 OR
     NEW.storage_path LIKE '/%' OR
     NEW.storage_path ~* '^https?://' OR
     NEW.storage_path LIKE 'collections/%' THEN
    RAISE EXCEPTION 'Invalid storage_path: prohibited sequence or protocol'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Lookup parent product slug
  SELECT slug INTO v_slug
  FROM public.products
  WHERE id = NEW.product_id;

  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'Parent product not found for image'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  v_expected_prefix := 'products/' || v_slug || '/';

  IF NOT (NEW.storage_path LIKE (v_expected_prefix || '%')) THEN
    RAISE EXCEPTION 'storage_path must start with %', v_expected_prefix
      USING ERRCODE = 'check_violation';
  END IF;

  v_filename := substr(NEW.storage_path, length(v_expected_prefix) + 1);

  IF v_filename LIKE '%/%' THEN
    RAISE EXCEPTION 'storage_path cannot have nested subdirectories within product folder'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Allowed formats:
  -- Phase 4: primary-[a-f0-9]{12,16}.(jpg|jpeg|png|webp)
  -- Phase 8: image-[a-f0-9]{12,64}.(jpg|jpeg|png|webp)
  IF NOT (v_filename ~* '^(primary-[a-f0-9]{12,16}|image-[a-f0-9]{12,64})\.(jpe?g|png|webp)$') THEN
    RAISE EXCEPTION 'storage_path filename must match primary-{hex} or image-{hex} format'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_guard_product_image_storage_path ON public.product_images;
CREATE TRIGGER trg_guard_product_image_storage_path
  BEFORE INSERT OR UPDATE OF storage_path, product_id ON public.product_images
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_product_image_storage_path();


-- 5. ENFORCE ACTIVE PRODUCT PRIMARY IMAGE CONSTRAINT TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_enforce_active_product_primary()
RETURNS trigger AS $$
DECLARE
  v_prod_id uuid;
  v_is_active boolean;
  v_primary_count integer;
BEGIN
  v_prod_id := COALESCE(NEW.product_id, OLD.product_id);

  SELECT is_active INTO v_is_active
  FROM public.products
  WHERE id = v_prod_id;

  IF v_is_active IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_is_active = true THEN
    SELECT count(*) FILTER (WHERE is_primary = true)
    INTO v_primary_count
    FROM public.product_images
    WHERE product_id = v_prod_id;

    IF v_primary_count <> 1 THEN
      RAISE EXCEPTION 'Active product must have exactly one primary image (found %)', v_primary_count
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
    SELECT is_active INTO v_is_active FROM public.products WHERE id = OLD.product_id;
    IF v_is_active = true THEN
      SELECT count(*) FILTER (WHERE is_primary = true) INTO v_primary_count
      FROM public.product_images WHERE product_id = OLD.product_id;
      IF v_primary_count <> 1 THEN
        RAISE EXCEPTION 'Active product must have exactly one primary image'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_enforce_active_product_primary ON public.product_images;
CREATE CONSTRAINT TRIGGER trg_enforce_active_product_primary
  AFTER INSERT OR UPDATE OR DELETE ON public.product_images
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_active_product_primary();


-- 6. RPC FUNCTIONS
-- ------------------------------------------------------------------------------

-- RPC 6.1: set_product_primary_image
CREATE OR REPLACE FUNCTION public.set_product_primary_image(
  p_product_id uuid,
  p_image_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
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

  -- Clear current primary first to satisfy partial unique index uq_product_images_single_primary
  UPDATE public.product_images
  SET is_primary = false
  WHERE product_id = p_product_id AND is_primary = true AND id <> p_image_id;

  -- Set new primary image
  UPDATE public.product_images
  SET is_primary = true
  WHERE product_id = p_product_id AND id = p_image_id;
END;
$$;

-- RPC 6.2: reorder_product_images
CREATE OR REPLACE FUNCTION public.reorder_product_images(
  p_product_id uuid,
  p_image_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_existing_count integer;
  v_arr_length integer;
  v_distinct_arr_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM 1 FROM public.products WHERE id = p_product_id FOR UPDATE;

  SELECT count(*) INTO v_existing_count
  FROM public.product_images
  WHERE product_id = p_product_id;

  v_arr_length := array_length(p_image_ids, 1);

  IF v_arr_length IS NULL OR v_arr_length <> v_existing_count THEN
    RAISE EXCEPTION 'Reorder array length (%) does not match existing image count (%)',
      COALESCE(v_arr_length, 0), v_existing_count
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(DISTINCT u) INTO v_distinct_arr_count
  FROM unnest(p_image_ids) AS u;

  IF v_distinct_arr_count <> v_existing_count THEN
    RAISE EXCEPTION 'Duplicate or mismatched image IDs in reorder array'
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(p_image_ids) AS u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_images
      WHERE id = u AND product_id = p_product_id
    )
  ) THEN
    RAISE EXCEPTION 'One or more image IDs do not belong to the specified product'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.product_images AS pi
  SET sort_order = ord.idx - 1
  FROM unnest(p_image_ids) WITH ORDINALITY AS ord(img_id, idx)
  WHERE pi.id = ord.img_id AND pi.product_id = p_product_id;
END;
$$;

-- RPC 6.3: remove_product_image_metadata
CREATE OR REPLACE FUNCTION public.remove_product_image_metadata(
  p_product_id uuid,
  p_image_id uuid
)
RETURNS TABLE (
  deleted_storage_path text,
  promoted_image_id uuid
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_is_active boolean;
  v_deleted_path text;
  v_was_primary boolean;
  v_total_images integer;
  v_promoted_id uuid := NULL;
BEGIN
  IF NOT public.is_admin() THEN
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

-- Execution permissions
GRANT EXECUTE ON FUNCTION public.set_product_primary_image(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_product_images(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_product_image_metadata(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.set_product_primary_image(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reorder_product_images(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_product_image_metadata(uuid, uuid) FROM PUBLIC, anon;
