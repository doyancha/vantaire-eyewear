import { z } from "zod";

/**
 * Schema for updating product merchandising flags (featured, best_seller, new_arrival).
 */
export const updateProductMerchandisingSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  expectedUpdatedAt: z.string().min(1, "Expected updated_at token is required"),
  featured: z.boolean(),
  bestSeller: z.boolean(),
  newArrival: z.boolean(),
});

export type UpdateProductMerchandisingInput = z.infer<typeof updateProductMerchandisingSchema>;

/**
 * Schema for atomically reordering products.
 */
export const reorderProductsSchema = z.object({
  desiredIds: z.array(z.string().uuid("Invalid UUID in desired product IDs")).min(1, "At least one product ID required"),
  expectedIds: z.array(z.string().uuid("Invalid UUID in expected product IDs")).min(1, "Expected order snapshot is required"),
});

export type ReorderProductsInput = z.infer<typeof reorderProductsSchema>;

/**
 * Schema for atomically reordering collections.
 */
export const reorderCollectionsSchema = z.object({
  desiredIds: z.array(z.string().uuid("Invalid UUID in desired collection IDs")).min(1, "At least one collection ID required"),
  expectedIds: z.array(z.string().uuid("Invalid UUID in expected collection IDs")).min(1, "Expected order snapshot is required"),
});

export type ReorderCollectionsInput = z.infer<typeof reorderCollectionsSchema>;
