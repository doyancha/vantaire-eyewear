-- ==============================================================================
-- VANTAIRE EYEWEAR v1.3 — PHASE 10 CLOSURE GATE
-- Reorder RPC Snapshot Concurrency Hardening
-- ==============================================================================
-- Invariant: Both reorder_products and reorder_collections MUST strictly require
-- p_expected_order IS NOT NULL to eliminate direct-call bypass of optimistic concurrency.
-- Any reorder call missing or passing NULL for p_expected_order is rejected with check_violation.
-- ==============================================================================

-- 1. HARDEN PRODUCT REORDER RPC
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

  -- 3. Enforce mandatory expected snapshot (prevent concurrency bypass)
  IF p_expected_order IS NULL THEN
    RAISE EXCEPTION 'Expected product order snapshot is mandatory for concurrency protection'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Validate array length
  SELECT count(*) INTO v_total_count FROM public.products;
  v_req_count := COALESCE(array_length(p_ordered_ids, 1), 0);

  IF v_req_count <> v_total_count THEN
    RAISE EXCEPTION 'Reorder array must contain exactly all % products (provided: %)',
      v_total_count, v_req_count
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Check for NULLs in payload
  IF EXISTS (SELECT 1 FROM unnest(p_ordered_ids) AS u WHERE u IS NULL) THEN
    RAISE EXCEPTION 'Product ID array cannot contain NULL values'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 6. Check for duplicates
  SELECT count(DISTINCT u) INTO v_dist_count
  FROM unnest(p_ordered_ids) AS u;

  IF v_dist_count <> v_total_count THEN
    RAISE EXCEPTION 'Duplicate product IDs found in reorder array'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 7. Check all product IDs exist
  SELECT count(*) INTO v_valid_count
  FROM public.products p
  WHERE p.id = ANY(p_ordered_ids);

  IF v_valid_count <> v_total_count THEN
    RAISE EXCEPTION 'One or more specified product IDs do not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 8. Mandatory snapshot concurrency verification
  SELECT array_agg(p.id ORDER BY p.sort_order ASC)
  INTO v_current_order
  FROM public.products p;

  IF v_current_order IS DISTINCT FROM p_expected_order THEN
    RAISE EXCEPTION 'Conflict: Product order has changed in another session'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 9. Atomically update sort_order and updated_at
  UPDATE public.products p
  SET sort_order = (ord.idx - 1)::integer,
      updated_at = clock_timestamp()
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS ord(id, idx)
  WHERE p.id = ord.id;

  RETURN QUERY SELECT true, v_total_count;
END;
$$;


-- 2. HARDEN COLLECTION REORDER RPC
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

  -- 3. Enforce mandatory expected snapshot (prevent concurrency bypass)
  IF p_expected_order IS NULL THEN
    RAISE EXCEPTION 'Expected collection order snapshot is mandatory for concurrency protection'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 4. Validate array length
  SELECT count(*) INTO v_total_count FROM public.collections;
  v_req_count := COALESCE(array_length(p_ordered_ids, 1), 0);

  IF v_req_count <> v_total_count THEN
    RAISE EXCEPTION 'Reorder array must contain exactly all % collections (provided: %)',
      v_total_count, v_req_count
      USING ERRCODE = 'check_violation';
  END IF;

  -- 5. Check for NULLs in payload
  IF EXISTS (SELECT 1 FROM unnest(p_ordered_ids) AS u WHERE u IS NULL) THEN
    RAISE EXCEPTION 'Collection ID array cannot contain NULL values'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 6. Check for duplicates
  SELECT count(DISTINCT u) INTO v_dist_count
  FROM unnest(p_ordered_ids) AS u;

  IF v_dist_count <> v_total_count THEN
    RAISE EXCEPTION 'Duplicate collection IDs found in reorder array'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 7. Check all collection IDs exist
  SELECT count(*) INTO v_valid_count
  FROM public.collections c
  WHERE c.id = ANY(p_ordered_ids);

  IF v_valid_count <> v_total_count THEN
    RAISE EXCEPTION 'One or more specified collection IDs do not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 8. Mandatory snapshot concurrency verification
  SELECT array_agg(c.id ORDER BY c.sort_order ASC)
  INTO v_current_order
  FROM public.collections c;

  IF v_current_order IS DISTINCT FROM p_expected_order THEN
    RAISE EXCEPTION 'Conflict: Collection order has changed in another session'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 9. Atomically update sort_order and updated_at
  UPDATE public.collections c
  SET sort_order = (ord.idx - 1)::integer,
      updated_at = clock_timestamp()
  FROM unnest(p_ordered_ids) WITH ORDINALITY AS ord(id, idx)
  WHERE c.id = ord.id;

  RETURN QUERY SELECT true, v_total_count;
END;
$$;

-- 3. PERMISSIONS & RPC GRANTS
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.reorder_products(uuid[], uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_products(uuid[], uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.reorder_collections(uuid[], uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_collections(uuid[], uuid[]) TO authenticated;
