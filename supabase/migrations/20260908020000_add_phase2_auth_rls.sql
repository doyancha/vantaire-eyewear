-- ==============================================================================
-- VANTAIRE EYEWEAR v1.3 — PHASE 2: AUTH, RBAC & ROW LEVEL SECURITY POLICIES
-- ==============================================================================
-- Migration: 20260908020000_add_phase2_auth_rls.sql
-- Description: Implements RBAC helper functions, last-owner protection trigger,
--              and fine-grained RLS policies across all 6 core database tables.
-- ==============================================================================

-- 1. RBAC AUTHORIZATION HELPER FUNCTIONS
-- ------------------------------------------------------------------------------
-- Defined with SECURITY DEFINER and fixed search_path = '' to prevent
-- search_path hijacking and eliminate RLS recursion when evaluating admin status.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid()
      AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.get_admin_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT role FROM public.admin_profiles
  WHERE id = auth.uid();
$$;

-- Secure execution grants
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_role() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_role() TO authenticated;


-- 2. LAST-OWNER REMOVAL & DEMOTION PROTECTION TRIGGER
-- ------------------------------------------------------------------------------
-- Guarantees at database level that the system can never reach zero owners.
CREATE OR REPLACE FUNCTION public.prevent_last_owner_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_other_owner_count INTEGER;
BEGIN
  IF (OLD.role = 'owner') AND (TG_OP = 'DELETE' OR NEW.role <> 'owner') THEN
    SELECT count(*) INTO v_other_owner_count
    FROM public.admin_profiles
    WHERE role = 'owner' AND id <> OLD.id;

    IF v_other_owner_count = 0 THEN
      RAISE EXCEPTION 'Action blocked: Cannot delete or demote the sole remaining owner in admin_profiles';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_last_owner_removal() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_admin_profiles_last_owner ON public.admin_profiles;
CREATE TRIGGER trg_admin_profiles_last_owner
BEFORE UPDATE OR DELETE ON public.admin_profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_owner_removal();


-- 3. RLS POLICIES: PUBLIC.ADMIN_PROFILES
-- ------------------------------------------------------------------------------
-- Policy 3.1: Admin can view their own profile
CREATE POLICY "admin_profiles_select_own"
ON public.admin_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy 3.2: Owner can view all admin profiles for staff oversight
CREATE POLICY "admin_profiles_select_owner"
ON public.admin_profiles
FOR SELECT
TO authenticated
USING (public.is_owner());

-- Policy 3.3: Owner can insert new admin profiles
CREATE POLICY "admin_profiles_insert_owner"
ON public.admin_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_owner());

-- Policy 3.4: Owner can update admin profiles (subject to last-owner trigger)
CREATE POLICY "admin_profiles_update_owner"
ON public.admin_profiles
FOR UPDATE
TO authenticated
USING (public.is_owner())
WITH CHECK (public.is_owner());

-- Policy 3.5: Owner can delete admin profiles (subject to last-owner trigger)
CREATE POLICY "admin_profiles_delete_owner"
ON public.admin_profiles
FOR DELETE
TO authenticated
USING (public.is_owner());


-- 4. RLS POLICIES: PUBLIC.PRODUCTS
-- ------------------------------------------------------------------------------
-- Policy 4.1: Public/Anon/Outsider select active products only
CREATE POLICY "products_select_public_active"
ON public.products
FOR SELECT
TO public
USING (is_active = true);

-- Policy 4.2: Admin/Owner select all products (including inactive/drafts)
CREATE POLICY "products_select_admin"
ON public.products
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Policy 4.3: Admin/Owner insert products
CREATE POLICY "products_insert_admin"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Policy 4.4: Admin/Owner update products
CREATE POLICY "products_update_admin"
ON public.products
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Policy 4.5: Admin/Owner delete products
CREATE POLICY "products_delete_admin"
ON public.products
FOR DELETE
TO authenticated
USING (public.is_admin());


-- 5. RLS POLICIES: PUBLIC.COLLECTIONS
-- ------------------------------------------------------------------------------
-- Policy 5.1: Public/Anon/Outsider select active collections only
CREATE POLICY "collections_select_public_active"
ON public.collections
FOR SELECT
TO public
USING (is_active = true);

-- Policy 5.2: Admin/Owner select all collections (including inactive)
CREATE POLICY "collections_select_admin"
ON public.collections
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Policy 5.3: Admin/Owner insert collections
CREATE POLICY "collections_insert_admin"
ON public.collections
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Policy 5.4: Admin/Owner update collections
CREATE POLICY "collections_update_admin"
ON public.collections
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Policy 5.5: Admin/Owner delete collections
CREATE POLICY "collections_delete_admin"
ON public.collections
FOR DELETE
TO authenticated
USING (public.is_admin());


-- 6. RLS POLICIES: PUBLIC.PRODUCT_COLLECTIONS
-- ------------------------------------------------------------------------------
-- Policy 6.1: Public select relationship only when BOTH product and collection are active
CREATE POLICY "product_collections_select_public"
ON public.product_collections
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_collections.product_id
      AND p.is_active = true
  )
  AND
  EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = product_collections.collection_id
      AND c.is_active = true
  )
);

-- Policy 6.2: Admin/Owner select all relations
CREATE POLICY "product_collections_select_admin"
ON public.product_collections
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Policy 6.3: Admin/Owner insert relations
CREATE POLICY "product_collections_insert_admin"
ON public.product_collections
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Policy 6.4: Admin/Owner update relations
CREATE POLICY "product_collections_update_admin"
ON public.product_collections
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Policy 6.5: Admin/Owner delete relations
CREATE POLICY "product_collections_delete_admin"
ON public.product_collections
FOR DELETE
TO authenticated
USING (public.is_admin());


-- 7. RLS POLICIES: PUBLIC.PRODUCT_IMAGES
-- ------------------------------------------------------------------------------
-- Policy 7.1: Public select image metadata only if parent product is active
CREATE POLICY "product_images_select_public"
ON public.product_images
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
      AND p.is_active = true
  )
);

-- Policy 7.2: Admin/Owner select all product image metadata
CREATE POLICY "product_images_select_admin"
ON public.product_images
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Policy 7.3: Admin/Owner insert image metadata
CREATE POLICY "product_images_insert_admin"
ON public.product_images
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Policy 7.4: Admin/Owner update image metadata
CREATE POLICY "product_images_update_admin"
ON public.product_images
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Policy 7.5: Admin/Owner delete image metadata
CREATE POLICY "product_images_delete_admin"
ON public.product_images
FOR DELETE
TO authenticated
USING (public.is_admin());


-- 8. RLS POLICIES: PUBLIC.SITE_SETTINGS
-- ------------------------------------------------------------------------------
-- Policy 8.1: Public/Anon/Outsider select singleton settings
CREATE POLICY "site_settings_select_public"
ON public.site_settings
FOR SELECT
TO public
USING (id = 1);

-- Policy 8.2: Admin/Owner select settings
CREATE POLICY "site_settings_select_admin"
ON public.site_settings
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Policy 8.3: Admin/Owner update singleton settings
CREATE POLICY "site_settings_update_admin"
ON public.site_settings
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin() AND id = 1);

-- Policy 8.4: Owner insert singleton settings (initialization/fallback only)
CREATE POLICY "site_settings_insert_owner"
ON public.site_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_owner() AND id = 1);

-- Policy 8.5: Owner delete settings (maintenance only)
CREATE POLICY "site_settings_delete_owner"
ON public.site_settings
FOR DELETE
TO authenticated
USING (public.is_owner());
