-- ==============================================================================
-- VANTAIRE EYEWEAR v1.3 — PHASE 4: PRODUCT MEDIA STORAGE & AUTHORIZATION MIGRATION
-- ==============================================================================
-- Migration: 20260908030000_add_phase4_product_media_storage.sql
-- Description:
--   1. Creates the public 'product-media' Supabase Storage bucket with strict MIME
--      and file size limits (5 MB max, image/jpeg, image/png, image/webp).
--   2. Establishes Row-Level Security (RLS) policies on storage.objects scoped
--      strictly to bucket_id = 'product-media'.
--   3. Authorizes only authenticated Staff (Owner and Admin via public.is_admin())
--      to INSERT, UPDATE, DELETE, and SELECT/list objects in the bucket.
--   4. Anonymous and outsider write operations are strictly prohibited.
--   5. Public storefront visitors access objects via public CDN URL endpoints.
-- ==============================================================================

-- 1. Create / Configure 'product-media' Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-media',
  'product-media',
  true,
  5242880, -- 5 MB (5 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Drop any pre-existing policies for this bucket to ensure clean idempotent state
DROP POLICY IF EXISTS "Admin and Owner can select product-media objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin and Owner can insert product-media objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin and Owner can update product-media objects" ON storage.objects;
DROP POLICY IF EXISTS "Admin and Owner can delete product-media objects" ON storage.objects;

-- 3. SELECT Policy: Authenticated Admin & Owner can list/inspect product-media objects
CREATE POLICY "Admin and Owner can select product-media objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-media'
  AND public.is_admin()
);

-- 4. INSERT Policy: Authenticated Admin & Owner can upload product-media objects
CREATE POLICY "Admin and Owner can insert product-media objects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-media'
  AND public.is_admin()
);

-- 5. UPDATE Policy: Authenticated Admin & Owner can update/replace product-media objects
CREATE POLICY "Admin and Owner can update product-media objects"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-media'
  AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'product-media'
  AND public.is_admin()
);

-- 6. DELETE Policy: Authenticated Admin & Owner can delete product-media objects
CREATE POLICY "Admin and Owner can delete product-media objects"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-media'
  AND public.is_admin()
);
