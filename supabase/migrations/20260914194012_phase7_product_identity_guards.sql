-- ==============================================================================
-- VANTAIRE EYEWEAR v1.3 — PHASE 7: PRODUCT IDENTITY GUARDS & DELETE HARDENING
-- ==============================================================================
-- 1. Disallow hard DELETE on public.products for authenticated/anon/public roles
-- 2. Monotonic advisory-locked auto-generation of legacy_id (vnt-XX) on insert
-- 3. Strict immutability enforcement on slug and legacy_id on update
-- ==============================================================================

-- 1. HARD-DELETE RESTRICTIONS
-- ------------------------------------------------------------------------------
-- Drop admin delete policy on products
DROP POLICY IF EXISTS "products_delete_admin" ON public.products;

-- Explicitly revoke DELETE privilege on products table from client roles
REVOKE DELETE ON public.products FROM authenticated, anon, public;


-- 2. AUTO-GENERATE LEGACY ID FUNCTION & TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_generate_product_legacy_id()
RETURNS trigger AS $$
DECLARE
  v_max_num integer;
  v_next_num integer;
BEGIN
  -- If legacy_id is not provided or blank, automatically allocate next vnt-XX
  IF NEW.legacy_id IS NULL OR trim(NEW.legacy_id) = '' THEN
    -- Acquire transaction-level advisory lock to serialize legacy_id allocation
    PERFORM pg_advisory_xact_lock(hashtext('products_legacy_id_lock'));

    -- Find maximum numeric suffix among existing vnt-XX products
    SELECT COALESCE(MAX(NULLIF(regexp_replace(legacy_id, '^vnt-', ''), '')::integer), 0)
    INTO v_max_num
    FROM public.products
    WHERE legacy_id ~ '^vnt-[0-9]+$';

    v_next_num := v_max_num + 1;
    NEW.legacy_id := 'vnt-' || lpad(v_next_num::text, 2, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_products_generate_legacy_id ON public.products;
CREATE TRIGGER trg_products_generate_legacy_id
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_generate_product_legacy_id();


-- 3. PREVENT PRODUCT IDENTITY MUTATION (IMMUTABLE SLUG & LEGACY_ID)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_prevent_product_identity_mutation()
RETURNS trigger AS $$
BEGIN
  IF OLD.slug IS DISTINCT FROM NEW.slug THEN
    RAISE EXCEPTION 'Product slug is immutable once created'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.legacy_id IS DISTINCT FROM NEW.legacy_id THEN
    RAISE EXCEPTION 'Product legacy_id is immutable once created'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_prevent_identity_mutation ON public.products;
CREATE TRIGGER trg_products_prevent_identity_mutation
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_product_identity_mutation();
