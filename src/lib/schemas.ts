import { z } from "zod";

export const FrameShapeEnum = z.enum([
  "Aviator",
  "Square",
  "Round",
  "Cat-Eye",
  "Geometric",
  "Sport",
  "Rectangular",
  "Oversized",
  "Browline",
]);

export const LensTypeEnum = z.enum([
  "Polarized-Style Tint",
  "Gradient Tint",
  "Dark Sun Tint",
  "Mirrored Finish",
]);

export const StyleCategoryEnum = z.enum([
  "Classic",
  "Contemporary",
  "Sport",
  "Retro",
  "Architectural",
]);

export const FitEnum = z.enum([
  "Narrow",
  "Medium",
  "Wide",
  "Universal",
]);

export const BadgeEnum = z.enum([
  "Bestseller",
  "New Arrival",
  "Limited Edition",
  "Signature Edit",
]);

export const GenderEnum = z.enum([
  "Unisex",
  "Men",
  "Women",
]);

export const AdminRoleEnum = z.enum([
  "owner",
  "admin",
]);

// Product Schema
export const productSchema = z.object({
  id: z.string().uuid().optional(),
  legacy_id: z.string().trim().min(1),
  slug: z.string().trim().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().trim().min(1),
  short_name: z.string().trim().min(1),
  category: z.literal("Sunglasses"),
  gender: GenderEnum,
  price: z.number().int().nonnegative(),
  compare_at_price: z.number().int().nonnegative().nullable().optional(),
  currency: z.literal("BDT"),
  currency_symbol: z.literal("৳"),
  description: z.string().trim().min(1),
  short_description: z.string().trim().min(1),
  frame_shape: FrameShapeEnum,
  frame_look: z.string().trim().min(1),
  frame_color: z.string().trim().min(1),
  lens_color: z.string().trim().min(1),
  lens_type: LensTypeEnum,
  style_category: StyleCategoryEnum,
  fit: FitEnum,
  features: z.array(z.string()),
  badge: BadgeEnum.nullable().optional(),
  featured: z.boolean().default(false),
  best_seller: z.boolean().default(false),
  new_arrival: z.boolean().default(false),
  in_stock: z.boolean().default(true),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  seo_title: z.string().trim().min(1),
  seo_description: z.string().trim().min(1),
}).refine(
  (data) => data.compare_at_price == null || data.compare_at_price >= data.price,
  {
    message: "compare_at_price must be greater than or equal to price",
    path: ["compare_at_price"],
  }
);

// Collection Schema
export const collectionSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  name: z.string().trim().min(1),
  tagline: z.string().trim().min(1),
  description: z.string().trim().min(1),
  cover_image: z.string().trim().min(1),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

// Product Image Schema
export const productImageSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  storage_path: z.string().trim().min(1),
  alt_text: z.string().trim().min(1),
  sort_order: z.number().int().nonnegative().default(0),
  is_primary: z.boolean().default(false),
});

// Site Settings Schema
export const siteSettingsSchema = z.object({
  id: z.literal(1).default(1),
  whatsapp_number: z.string().trim().min(1),
  whatsapp_display_number: z.string().trim().min(1),
  whatsapp_is_demo: z.boolean().default(true),
  whatsapp_default_greeting: z.string().trim().min(1),
  contact_phone: z.string().trim().min(1),
  contact_email: z.string().trim().email(),
  contact_hours: z.string().trim().min(1),
  contact_friday_hours: z.string().trim().min(1),
  contact_location: z.string().trim().min(1),
  contact_service_area: z.string().trim().min(1),
  delivery_inside_dhaka_time: z.string().trim().min(1),
  delivery_outside_dhaka_time: z.string().trim().min(1),
  delivery_fee_inside_dhaka: z.number().int().nonnegative(),
  delivery_fee_outside_dhaka: z.number().int().nonnegative(),
  delivery_currency_symbol: z.literal("৳"),
  delivery_currency_code: z.literal("BDT"),
  delivery_cash_on_delivery: z.boolean().default(true),
  delivery_advance_payment_note: z.string().trim().min(1),
  delivery_packaging: z.string().trim().min(1),
  social_instagram: z.string().default(""),
  social_facebook: z.string().default(""),
});

// Admin Profile Schema
export const adminProfileSchema = z.object({
  id: z.string().uuid(),
  role: AdminRoleEnum.default("admin"),
  display_name: z.string().trim().nullable().optional(),
});
