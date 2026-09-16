-- ==============================================================================
-- VANTAIRE EYEWEAR v1.3 — PHASE 10: MERCHANDISING MANAGEMENT & ORDERING INTEGRITY
-- ==============================================================================
-- Migration: 20260916214520_phase10_merchandising_integrity.sql
-- Description:
--   1. Enforces inactive product merchandising invariant: inactive products cannot
--      be featured, best_seller, or new_arrival.
--   2. Product deactivation trigger: automatically clears featured, best_seller,
--      and new_arrival when is_active transitions to false.
--   3. Hardens product sort_order: default -1, auto-allocation trigger under
--      transaction advisory lock, non-negative CHECK, deferrable UNIQUE constraint,
--      and deferred contiguity check trigger.
--   4. Hardens collection sort_order: default -1, auto-allocation trigger under
--      transaction advisory lock, non-negative CHECK, deferrable UNIQUE constraint,
--      and deferred contiguity check trigger.
--   5. Atomic transactional RPC public.reorder_products with full set validation,
--      advisory lock, and snapshot concurrency protection.
--   6. Atomic transactional RPC public.reorder_collections with full set validation,
--      advisory lock, and snapshot concurrency protection.
--   7. Grants & revokes on reorder RPC functions.
-- ==============================================================================

-- 1. INACTIVE PRODUCT MERCHANDISING INVARIANT & DEACTIVATION TRIGGER
-- ------------------------------------------------------------------------------
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS chk_products_inactive_merchandising;
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_inactive_merchandising
  CHECK (
    is_active = true OR (
      featured = false AND
      best_seller = false AND
      new_arrival = false
    )
  );

CREATE OR REPLACE FUNCTION public.fn_clear_product_merchandising_on_deactivation()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    NEW.featured := false;
    NEW.best_seller := false;
    NEW.new_arrival := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_clear_product_merchandising_on_deactivation ON public.products;
CREATE TRIGGER trg_clear_product_merchandising_on_deactivation
  BEFORE UPDATE OF is_active ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_clear_product_merchandising_on_deactivation();


-- 2. PRODUCT SORT_ORDER AUTO-ALLOCATION & CONSTRAINTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.products ALTER COLUMN sort_order SET DEFAULT -1;

CREATE OR REPLACE FUNCTION public.fn_allocate_product_sort_order()
RETURNS trigger AS $$
BEGIN
  -- Transaction-level advisory lock for product sort allocation
  PERFORM pg_advisory_xact_lock(7421001);

  IF NEW.sort_order IS NULL OR NEW.sort_order < 0 THEN
    SELECT COALESCE(max(sort_order), -1) + 1
    INTO NEW.sort_order
    FROM public.products;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_allocate_product_sort_order ON public.products;
CREATE TRIGGER trg_allocate_product_sort_order
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_allocate_product_sort_order();

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS chk_products_sort_order_nonnegative;
ALTER TABLE public.products
  ADD CONSTRAINT chk_products_sort_order_nonnegative
  CHECK (sort_order >= 0);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS uq_products_sort_order;
ALTER TABLE public.products
  ADD CONSTRAINT uq_products_sort_order
  UNIQUE (sort_order)
  DEFERRABLE INITIALLY DEFERRED;

CREATE OR REPLACE FUNCTION public.fn_enforce_product_sort_order_contiguous()
RETURNS trigger AS $$
DECLARE
  v_cnt integer;
  v_min integer;
  v_max integer;
  v_dist_cnt integer;
BEGIN
  SELECT count(*), min(sort_order), max(sort_order), count(DISTINCT sort_order)
  INTO v_cnt, v_min, v_max, v_dist_cnt
  FROM public.products;

  IF v_cnt > 0 THEN
    IF v_min <> 0 OR v_max <> (v_cnt - 1) OR v_dist_cnt <> v_cnt THEN
      RAISE EXCEPTION 'Product sort_order must be contiguous starting from 0 (min: %, max: %, count: %, distinct: %)',
        v_min, v_max, v_cnt, v_dist_cnt
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_enforce_product_sort_order_contiguous ON public.products;
CREATE CONSTRAINT TRIGGER trg_enforce_product_sort_order_contiguous
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_product_sort_order_contiguous();


-- 3. COLLECTION SORT_ORDER AUTO-ALLOCATION & CONSTRAINTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.collections ALTER COLUMN sort_order SET DEFAULT -1;

CREATE OR REPLACE FUNCTION public.fn_allocate_collection_sort_order()
RETURNS trigger AS $$
BEGIN
  -- Transaction-level advisory lock for collection sort allocation
  PERFORM pg_advisory_xact_lock(7421002);

  IF NEW.sort_order IS NULL OR NEW.sort_order < 0 THEN
    SELECT COALESCE(max(sort_order), -1) + 1
    INTO NEW.sort_order
    FROM public.collections;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_allocate_collection_sort_order ON public.collections;
CREATE TRIGGER trg_allocate_collection_sort_order
  BEFORE INSERT ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_allocate_collection_sort_order();

ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS chk_collections_sort_order_nonnegative;
ALTER TABLE public.collections
  ADD CONSTRAINT chk_collections_sort_order_nonnegative
  CHECK (sort_order >= 0);

ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS uq_collections_sort_order;
ALTER TABLE public.collections
  ADD CONSTRAINT uq_collections_sort_order
  UNIQUE (sort_order)
  DEFERRABLE INITIALLY DEFERRED;

CREATE OR REPLACE FUNCTION public.fn_enforce_collection_sort_order_contiguous()
RETURNS trigger AS $$
DECLARE
  v_cnt integer;
  v_min integer;
  v_max integer;
  v_dist_cnt integer;
BEGIN
  SELECT count(*), min(sort_order), max(sort_order), count(DISTINCT sort_order)
  INTO v_cnt, v_min, v_max, v_dist_cnt
  FROM public.collections;

  IF v_cnt > 0 THEN
    IF v_min <> 0 OR v_max <> (v_cnt - 1) OR v_dist_cnt <> v_cnt THEN
      RAISE EXCEPTION 'Collection sort_order must be contiguous starting from 0 (min: %, max: %, count: %, distinct: %)',
        v_min, v_max, v_cnt, v_dist_cnt
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_enforce_collection_sort_order_contiguous ON public.collections;
CREATE CONSTRAINT TRIGGER trg_enforce_collection_sort_order_contiguous
  AFTER INSERT OR UPDATE OR DELETE ON public.collections
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_collection_sort_order_contiguous();


-- 4. ATOMIC TRANSACTIONAL PRODUCT REORDER RPC
-- ------------------------------------------------------------------------------
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
SET search_path = ''
AS $$
DECLARE
  v_total_count integer;
  v_req_count integer;
  v_dist_count integer;
  v_valid_count integer;
  v_current_order uuid[];
BEGIN
  -- 1. Require admin authorization
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Acquire transaction-level advisory lock
  PERFORM pg_advisory_xact_lock(7421001);

  -- 3. Validate array length
  SELECT count(*) INTO v_total_count FROM public.products;
  v_req_count := COALESCE(array_length(p_ordered_ids, 1), 0);

  IF v_req_count <> v_total_count THEN
    RAISE EXCEPTION 'Reorder array must contain exactly all % products (provided: %)',
      v_total_count, v_req_count
      USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Check for NULLs
  IF EXISTS (SELECT 1 FROM unnest(p_ordered_ids) AS u WHERE u IS NULL) THEN
    RAISE EXCEPTION 'Product ID array cannot contain NULL values'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Check for duplicates
  SELECT count(DISTINCT u) INTO v_dist_count
  FROM unnest(p_ordered_ids) AS u;

  IF v_dist_count <> v_total_count THEN
    RAISE EXCEPTION 'Duplicate product IDs found in reorder array'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 6. Check all product IDs exist
  SELECT count(*) INTO v_valid_count
  FROM public.products p
  WHERE p.id = ANY(p_ordered_ids);

  IF v_valid_count <> v_total_count THEN
    RAISE EXCEPTION 'One or more specified product IDs do not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 7. Snapshot concurrency check
  IF p_expected_order IS NOT NULL THEN
    SELECT array_agg(p.id ORDER BY p.sort_order ASC)
    INTO v_current_order
    FROM public.products p;

    IF v_current_order IS DISTINCT FROM p_expected_order THEN
      RAISE EXCEPTION 'Conflict: Product order has changed in another session'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- 8. Atomically update sort_order and updated_at
  UPDATE public.products p
  SET sort_order = (ord.idx - 1)::integer,
      updated_at = clock_timestamp()
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS ord(id, idx)
  WHERE p.id = ord.id;

  RETURN QUERY SELECT true, v_total_count;
END;
$$;


-- 5. ATOMIC TRANSACTIONAL COLLECTION REORDER RPC
-- ------------------------------------------------------------------------------
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
SET search_path = ''
AS $$
DECLARE
  v_total_count integer;
  v_req_count integer;
  v_dist_count integer;
  v_valid_count integer;
  v_current_order uuid[];
BEGIN
  -- 1. Require admin authorization
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin role required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Acquire transaction-level advisory lock
  PERFORM pg_advisory_xact_lock(7421002);

  -- 3. Validate array length
  SELECT count(*) INTO v_total_count FROM public.collections;
  v_req_count := COALESCE(array_length(p_ordered_ids, 1), 0);

  IF v_req_count <> v_total_count THEN
    RAISE EXCEPTION 'Reorder array must contain exactly all % collections (provided: %)',
      v_total_count, v_req_count
      USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Check for NULLs
  IF EXISTS (SELECT 1 FROM unnest(p_ordered_ids) AS u WHERE u IS NULL) THEN
    RAISE EXCEPTION 'Collection ID array cannot contain NULL values'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Check for duplicates
  SELECT count(DISTINCT u) INTO v_dist_count
  FROM unnest(p_ordered_ids) AS u;

  IF v_dist_count <> v_total_count THEN
    RAISE EXCEPTION 'Duplicate collection IDs found in reorder array'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 6. Check all collection IDs exist
  SELECT count(*) INTO v_valid_count
  FROM public.collections c
  WHERE c.id = ANY(p_ordered_ids);

  IF v_valid_count <> v_total_count THEN
    RAISE EXCEPTION 'One or more specified collection IDs do not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 7. Snapshot concurrency check
  IF p_expected_order IS NOT NULL THEN
    SELECT array_agg(c.id ORDER BY c.sort_order ASC)
    INTO v_current_order
    FROM public.collections c;

    IF v_current_order IS DISTINCT FROM p_expected_order THEN
      RAISE EXCEPTION 'Conflict: Collection order has changed in another session'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- 8. Atomically update sort_order and updated_at
  UPDATE public.collections c
  SET sort_order = (ord.idx - 1)::integer,
      updated_at = clock_timestamp()
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS ord(id, idx)
  WHERE c.id = ord.id;

  RETURN QUERY SELECT true, v_total_count;
END;
$$;


-- 6. RPC FUNCTION PERMISSIONS
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.reorder_products(uuid[], uuid[]) TO authenticated;
REVOKE ALL ON FUNCTION public.reorder_products(uuid[], uuid[]) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.reorder_collections(uuid[], uuid[]) TO authenticated;
REVOKE ALL ON FUNCTION public.reorder_collections(uuid[], uuid[]) FROM PUBLIC, anon;
