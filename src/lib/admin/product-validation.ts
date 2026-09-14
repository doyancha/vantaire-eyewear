import { z } from "zod";

/**
 * Utility to convert raw features input (newline-delimited text or string array)
 * into a clean array of non-empty trimmed strings.
 */
export function normalizeFeatures(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map((f) => String(f).trim()).filter((f) => f.length > 0);
  }
  if (typeof input === "string") {
    return input
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }
  return [];
}

/**
 * Generates a URL-safe kebab-case slug from a product name.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Base product fields schema common across create and edit.
 */
const baseProductFields = {
  name: z.string().trim().min(2, "Product name must be at least 2 characters").max(100, "Name must be under 100 characters"),
  short_name: z.string().trim().min(2, "Short name must be at least 2 characters").max(50, "Short name must be under 50 characters"),
  category: z.string().trim().min(1, "Category is required").default("Sunglasses"),
  gender: z
    .enum(["Unisex", "Men", "Women"], {
      message: "Gender must be Unisex, Men, or Women",
    })
    .default("Unisex"),
  price: z.coerce
    .number({ message: "Price must be a valid number" })
    .int("Price must be an integer (in BDT)")
    .min(0, "Price cannot be negative"),
  compare_at_price: z
    .union([
      z.coerce.number().int("Compare at price must be an integer").min(0),
      z.literal("").transform(() => null),
      z.null(),
      z.undefined(),
    ])
    .nullable()
    .optional(),
  description: z.string().trim().min(10, "Description must be at least 10 characters"),
  short_description: z.string().trim().min(5, "Short description must be at least 5 characters"),
  frame_shape: z.string().trim().min(1, "Frame shape is required"),
  frame_look: z.string().trim().min(1, "Frame look/material is required"),
  frame_color: z.string().trim().min(1, "Frame color is required"),
  lens_color: z.string().trim().min(1, "Lens color is required"),
  lens_type: z.string().trim().min(1, "Lens type is required"),
  style_category: z.string().trim().min(1, "Style category is required"),
  fit: z
    .enum(["Universal", "Medium", "Narrow", "Wide"], {
      message: "Fit must be Universal, Medium, Narrow, or Wide",
    })
    .default("Universal"),
  features: z
    .union([z.array(z.string()), z.string()])
    .transform(normalizeFeatures)
    .refine((items) => items.length >= 1, "At least one product feature bullet is required"),
  badge: z
    .string()
    .trim()
    .max(30, "Badge must be under 30 characters")
    .transform((val) => (val.length === 0 ? null : val))
    .nullable()
    .optional(),
  seo_title: z.string().trim().min(5, "SEO Title must be at least 5 characters").max(100, "SEO Title must be under 100 characters"),
  seo_description: z.string().trim().min(10, "SEO Description must be at least 10 characters").max(250, "SEO Description must be under 250 characters"),
};

/**
 * Validation schema for creating a new product.
 * Requires a valid slug. legacy_id is handled by database trigger.
 */
export const createProductSchema = z
  .object({
    ...baseProductFields,
    slug: z
      .string()
      .trim()
      .min(2, "Slug must be at least 2 characters")
      .max(80, "Slug must be under 80 characters")
      .regex(SLUG_REGEX, "Slug must contain only lowercase letters, numbers, and single hyphens"),
  })
  .refine(
    (data) => {
      if (data.compare_at_price != null && data.compare_at_price > 0) {
        return data.compare_at_price >= data.price;
      }
      return true;
    },
    {
      message: "Compare-at price must be greater than or equal to current price",
      path: ["compare_at_price"],
    }
  );

export type CreateProductInput = z.input<typeof createProductSchema>;
export type CreateProductOutput = z.output<typeof createProductSchema>;

/**
 * Validation schema for editing an existing product.
 * Includes optimistic concurrency token (updated_at) and inventory stock flag.
 * Slugs and legacy_ids are immutable and omitted from editable payload.
 */
export const updateProductSchema = z
  .object({
    id: z.string().uuid("Invalid product ID"),
    updated_at: z.string().min(1, "Concurrency token (updated_at) is required"),
    in_stock: z.boolean().default(true),
    ...baseProductFields,
  })
  .refine(
    (data) => {
      if (data.compare_at_price != null && data.compare_at_price > 0) {
        return data.compare_at_price >= data.price;
      }
      return true;
    },
    {
      message: "Compare-at price must be greater than or equal to current price",
      path: ["compare_at_price"],
    }
  );

export type UpdateProductInput = z.input<typeof updateProductSchema>;
export type UpdateProductOutput = z.output<typeof updateProductSchema>;

/**
 * Schema for archive / restore action tokens.
 */
export const productActionTokenSchema = z.object({
  id: z.string().uuid("Invalid product ID"),
  updated_at: z.string().min(1, "Concurrency token (updated_at) is required"),
});

export type ProductActionTokenInput = z.infer<typeof productActionTokenSchema>;
