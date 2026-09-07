-- ==============================================================================
-- VANTAIRE EYEWEAR v1.3 — PHASE 1: CORE DATABASE SCHEMA
-- ==============================================================================
-- Migration: 20260908010000_create_v1_3_core_schema.sql
-- Description: Establishes products, collections, product_collections,
--              product_images, site_settings, and admin_profiles with
--              domain integrity constraints, indexes, triggers, and RLS enabled.
-- ==============================================================================

-- 1. REUSABLE UPDATED_AT TRIGGER FUNCTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. PRODUCTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Sunglasses',
  gender TEXT NOT NULL DEFAULT 'Unisex',
  price INTEGER NOT NULL,
  compare_at_price INTEGER NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  currency_symbol TEXT NOT NULL DEFAULT '৳',
  description TEXT NOT NULL,
  short_description TEXT NOT NULL,
  frame_shape TEXT NOT NULL,
  frame_look TEXT NOT NULL,
  frame_color TEXT NOT NULL,
  lens_color TEXT NOT NULL,
  lens_type TEXT NOT NULL,
  style_category TEXT NOT NULL,
  fit TEXT NOT NULL,
  features TEXT[] NOT NULL DEFAULT '{}',
  badge TEXT NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  best_seller BOOLEAN NOT NULL DEFAULT false,
  new_arrival BOOLEAN NOT NULL DEFAULT false,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT NOT NULL,
  seo_description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_products_legacy_id_not_blank CHECK (length(trim(legacy_id)) > 0),
  CONSTRAINT chk_products_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT chk_products_slug_not_blank CHECK (length(trim(slug)) > 0),
  CONSTRAINT chk_products_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT chk_products_short_name_not_blank CHECK (length(trim(short_name)) > 0),
  CONSTRAINT chk_products_category CHECK (category = 'Sunglasses'),
  CONSTRAINT chk_products_gender CHECK (gender IN ('Unisex', 'Men', 'Women')),
  CONSTRAINT chk_products_price_non_negative CHECK (price >= 0),
  CONSTRAINT chk_products_compare_at_price CHECK (compare_at_price IS NULL OR compare_at_price >= price),
  CONSTRAINT chk_products_currency CHECK (currency = 'BDT'),
  CONSTRAINT chk_products_currency_symbol CHECK (currency_symbol = '৳'),
  CONSTRAINT chk_products_description_not_blank CHECK (length(trim(description)) > 0),
  CONSTRAINT chk_products_short_desc_not_blank CHECK (length(trim(short_description)) > 0),
  CONSTRAINT chk_products_frame_shape CHECK (frame_shape IN ('Aviator', 'Square', 'Round', 'Cat-Eye', 'Geometric', 'Sport', 'Rectangular', 'Oversized', 'Browline')),
  CONSTRAINT chk_products_frame_look_not_blank CHECK (length(trim(frame_look)) > 0),
  CONSTRAINT chk_products_frame_color_not_blank CHECK (length(trim(frame_color)) > 0),
  CONSTRAINT chk_products_lens_color_not_blank CHECK (length(trim(lens_color)) > 0),
  CONSTRAINT chk_products_lens_type CHECK (lens_type IN ('Polarized-Style Tint', 'Gradient Tint', 'Dark Sun Tint', 'Mirrored Finish')),
  CONSTRAINT chk_products_style_category CHECK (style_category IN ('Classic', 'Contemporary', 'Sport', 'Retro', 'Architectural')),
  CONSTRAINT chk_products_fit CHECK (fit IN ('Narrow', 'Medium', 'Wide', 'Universal')),
  CONSTRAINT chk_products_badge CHECK (badge IS NULL OR badge IN ('Bestseller', 'New Arrival', 'Limited Edition', 'Signature Edit')),
  CONSTRAINT chk_products_seo_title_not_blank CHECK (length(trim(seo_title)) > 0),
  CONSTRAINT chk_products_seo_desc_not_blank CHECK (length(trim(seo_description)) > 0)
);

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for Products
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_products_featured ON public.products(featured) WHERE is_active = true;
CREATE INDEX idx_products_best_seller ON public.products(best_seller) WHERE is_active = true;
CREATE INDEX idx_products_new_arrival ON public.products(new_arrival) WHERE is_active = true;
CREATE INDEX idx_products_sort_order ON public.products(sort_order);

-- 3. COLLECTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_collections_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT chk_collections_slug_not_blank CHECK (length(trim(slug)) > 0),
  CONSTRAINT chk_collections_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT chk_collections_tagline_not_blank CHECK (length(trim(tagline)) > 0),
  CONSTRAINT chk_collections_desc_not_blank CHECK (length(trim(description)) > 0),
  CONSTRAINT chk_collections_cover_image_not_blank CHECK (length(trim(cover_image)) > 0)
);

CREATE TRIGGER trg_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for Collections
CREATE INDEX idx_collections_is_active ON public.collections(is_active);
CREATE INDEX idx_collections_sort_order ON public.collections(sort_order);

-- 4. PRODUCT_COLLECTIONS JOIN TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.product_collections (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (product_id, collection_id),
  CONSTRAINT chk_product_collections_position_non_negative CHECK (position >= 0)
);

-- Indexes for Product Collections
CREATE INDEX idx_product_collections_col_pos ON public.product_collections(collection_id, position);
CREATE INDEX idx_product_collections_prod_id ON public.product_collections(product_id);

-- 5. PRODUCT_IMAGES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_product_images_path_not_blank CHECK (length(trim(storage_path)) > 0),
  CONSTRAINT chk_product_images_alt_not_blank CHECK (length(trim(alt_text)) > 0),
  CONSTRAINT chk_product_images_sort_order_non_negative CHECK (sort_order >= 0),
  CONSTRAINT uq_product_images_path UNIQUE (product_id, storage_path)
);

-- Partial Unique Index: Exactly at most ONE primary image per product
CREATE UNIQUE INDEX uq_product_images_single_primary
ON public.product_images(product_id)
WHERE is_primary = true;

CREATE INDEX idx_product_images_product_sort ON public.product_images(product_id, sort_order);

CREATE TRIGGER trg_product_images_updated_at
BEFORE UPDATE ON public.product_images
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. SITE_SETTINGS TABLE (SINGLETON)
-- ------------------------------------------------------------------------------
CREATE TABLE public.site_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  whatsapp_number TEXT NOT NULL DEFAULT '8801700000000',
  whatsapp_display_number TEXT NOT NULL DEFAULT '+880 1700-000000',
  whatsapp_is_demo BOOLEAN NOT NULL DEFAULT true,
  whatsapp_default_greeting TEXT NOT NULL,
  contact_phone TEXT NOT NULL DEFAULT '+880 1700-000000',
  contact_email TEXT NOT NULL DEFAULT 'contact@vantaireeyewear.com',
  contact_hours TEXT NOT NULL,
  contact_friday_hours TEXT NOT NULL,
  contact_location TEXT NOT NULL DEFAULT 'Dhaka, Bangladesh',
  contact_service_area TEXT NOT NULL DEFAULT 'Nationwide Bangladesh',
  delivery_inside_dhaka_time TEXT NOT NULL DEFAULT 'Approximately 2 days',
  delivery_outside_dhaka_time TEXT NOT NULL DEFAULT 'Approximately 4 days',
  delivery_fee_inside_dhaka INTEGER NOT NULL DEFAULT 70,
  delivery_fee_outside_dhaka INTEGER NOT NULL DEFAULT 120,
  delivery_currency_symbol TEXT NOT NULL DEFAULT '৳',
  delivery_currency_code TEXT NOT NULL DEFAULT 'BDT',
  delivery_cash_on_delivery BOOLEAN NOT NULL DEFAULT true,
  delivery_advance_payment_note TEXT NOT NULL,
  delivery_packaging TEXT NOT NULL,
  social_instagram TEXT DEFAULT '',
  social_facebook TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Singleton Constraint
  CONSTRAINT chk_site_settings_singleton CHECK (id = 1),
  CONSTRAINT chk_site_settings_whatsapp_number_not_blank CHECK (length(trim(whatsapp_number)) > 0),
  CONSTRAINT chk_site_settings_contact_email_not_blank CHECK (length(trim(contact_email)) > 0),
  CONSTRAINT chk_site_settings_fee_inside_non_negative CHECK (delivery_fee_inside_dhaka >= 0),
  CONSTRAINT chk_site_settings_fee_outside_non_negative CHECK (delivery_fee_outside_dhaka >= 0),
  CONSTRAINT chk_site_settings_currency_symbol CHECK (delivery_currency_symbol = '৳'),
  CONSTRAINT chk_site_settings_currency_code CHECK (delivery_currency_code = 'BDT')
);

CREATE TRIGGER trg_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. ADMIN_PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  display_name TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_admin_profiles_role CHECK (role IN ('owner', 'admin'))
);

CREATE TRIGGER trg_admin_profiles_updated_at
BEFORE UPDATE ON public.admin_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. ROW LEVEL SECURITY (RLS) ACTIVATION
-- ------------------------------------------------------------------------------
-- RLS is enabled on all tables in Phase 1 with ZERO permissive public write policies.
-- Public and admin security policies will be fully defined and verified in Phase 2.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
