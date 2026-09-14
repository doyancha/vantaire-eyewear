-- ==============================================================================
-- VANTAIRE EYEWEAR v1.3 — PHASE 7 SECURITY CLOSURE: LEGACY ID TRIGGER HARDENING
-- ==============================================================================
-- Replaces fn_generate_product_legacy_id() to:
-- 1. Eliminate SECURITY DEFINER in favor of default least-privilege SECURITY INVOKER
-- 2. Enforce fixed safe search_path = ''
-- 3. Maintain monotonic advisory-locked legacy_id (vnt-XX) allocation
-- 4. Revoke unnecessary direct execution privileges from client roles
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_generate_product_legacy_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
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
$$;

-- Revoke direct execution from client roles to minimize surface area
REVOKE ALL ON FUNCTION public.fn_generate_product_legacy_id() FROM PUBLIC, anon, authenticated;
