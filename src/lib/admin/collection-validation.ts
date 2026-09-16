import { z } from "zod";

/**
 * Regex for collection slug: lowercase alphanumeric separated by single hyphens.
 */
export const COLLECTION_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Schema for creating a new collection (draft).
 */
export const createCollectionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Collection name must be at least 2 characters long")
    .max(100, "Collection name cannot exceed 100 characters"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Slug must be at least 2 characters long")
    .max(50, "Slug cannot exceed 50 characters")
    .regex(
      COLLECTION_SLUG_REGEX,
      "Slug must contain only lowercase letters, numbers, and hyphens (e.g. 'the-verona-cat-eye')"
    ),
  tagline: z
    .string()
    .trim()
    .min(2, "Tagline must be at least 2 characters long")
    .max(200, "Tagline cannot exceed 200 characters"),
  description: z
    .string()
    .trim()
    .min(5, "Description must be at least 5 characters long")
    .max(2000, "Description cannot exceed 2000 characters"),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

/**
 * Schema for updating an existing collection's core metadata.
 * Note: slug is strictly immutable and cannot be updated.
 */
export const updateCollectionSchema = z.object({
  id: z.string().uuid("Invalid collection ID"),
  updated_at: z.string().min(1, "Optimistic concurrency token (updated_at) is required"),
  name: z
    .string()
    .trim()
    .min(2, "Collection name must be at least 2 characters long")
    .max(100, "Collection name cannot exceed 100 characters"),
  tagline: z
    .string()
    .trim()
    .min(2, "Tagline must be at least 2 characters long")
    .max(200, "Tagline cannot exceed 200 characters"),
  description: z
    .string()
    .trim()
    .min(5, "Description must be at least 5 characters long")
    .max(2000, "Description cannot exceed 2000 characters"),
});

export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;

/**
 * Schema for lifecycle status updates (Archive / Restore).
 */
export const collectionLifecycleSchema = z.object({
  id: z.string().uuid("Invalid collection ID"),
  updated_at: z.string().min(1, "Concurrency token (updated_at) is required"),
});

export type CollectionLifecycleInput = z.infer<typeof collectionLifecycleSchema>;

/**
 * Schema for atomic collection product membership saving & reordering.
 */
export const saveCollectionMembershipSchema = z.object({
  collection_id: z.string().uuid("Invalid collection ID"),
  updated_at: z.string().min(1, "Concurrency token (updated_at) is required"),
  product_ids: z.array(z.string().uuid("Invalid product ID")),
});

export type SaveCollectionMembershipInput = z.infer<typeof saveCollectionMembershipSchema>;

/**
 * Helper to slugify a name for suggesting collection slugs in the create form.
 */
export function slugifyCollectionName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
