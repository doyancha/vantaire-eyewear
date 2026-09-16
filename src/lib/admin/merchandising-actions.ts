"use server";

import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import {
  updateProductMerchandisingSchema,
  reorderProductsSchema,
  reorderCollectionsSchema,
} from "@/lib/admin/merchandising-validation";
import { revalidateMerchandisingCaches } from "@/lib/admin/revalidate";
import { ActionResponse } from "@/lib/admin/product-actions";
import { Tables } from "@/types/database.types";

/**
 * Server Action: Update product merchandising flags (featured, best_seller, new_arrival)
 * Enforces:
 * 1. requireAdmin()
 * 2. Inactive products cannot have merchandising flags set to true
 * 3. Optimistic concurrency control via expectedUpdatedAt
 * 4. Cache revalidation
 */
export async function updateProductMerchandisingAction(
  rawInput: unknown
): Promise<ActionResponse<Tables<"products">>> {
  await requireAdmin();
  const supabase = await createClient();

  const parsed = updateProductMerchandisingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the errors below.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { productId, expectedUpdatedAt, featured, bestSeller, newArrival } = parsed.data;

  // 1. Fetch current product record
  const { data: current, error: fetchErr } = await supabase
    .from("products")
    .select("id, slug, name, is_active, updated_at")
    .eq("id", productId)
    .maybeSingle();

  if (fetchErr || !current) {
    return {
      success: false,
      message: "Product not found.",
    };
  }

  // 2. Concurrency check
  if (current.updated_at !== expectedUpdatedAt) {
    return {
      success: false,
      message: "Conflict: This product changed in another session. Reload the latest data.",
    };
  }

  // 3. Inactive invariant guard
  if (!current.is_active && (featured || bestSeller || newArrival)) {
    return {
      success: false,
      message: "Inactive products cannot be flagged as Featured, Best Seller, or New Arrival.",
    };
  }

  // 4. Update row with optimistic lock
  const { data: updated, error: updateErr } = await supabase
    .from("products")
    .update({
      featured,
      best_seller: bestSeller,
      new_arrival: newArrival,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("updated_at", expectedUpdatedAt)
    .select()
    .maybeSingle();

  if (updateErr) {
    return {
      success: false,
      message: `Database error updating merchandising: ${updateErr.message}`,
    };
  }

  if (!updated) {
    return {
      success: false,
      message: "Conflict: Product was modified by another session. Please refresh and try again.",
    };
  }

  // 5. Revalidate affected surfaces
  await revalidateMerchandisingCaches({ productSlug: updated.slug });

  return {
    success: true,
    message: `Merchandising updated for "${updated.name}".`,
    data: updated,
  };
}

/**
 * Server Action: Atomically reorder catalog products
 * Invokes public.reorder_products RPC under transaction advisory lock
 * with complete set validation and snapshot concurrency protection.
 */
export async function reorderProductsAction(
  rawInput: unknown
): Promise<ActionResponse<{ success: boolean; totalReordered: number }>> {
  await requireAdmin();
  const supabase = await createClient();

  const parsed = reorderProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid reorder parameters.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { desiredIds, expectedIds } = parsed.data;

  const { data: rpcRes, error: rpcErr } = await supabase.rpc("reorder_products", {
    p_ordered_ids: desiredIds,
    p_expected_order: expectedIds,
  });

  if (rpcErr) {
    if (
      rpcErr.message.includes("Conflict") ||
      rpcErr.message.includes("changed in another session")
    ) {
      return {
        success: false,
        message: "Catalog order changed in another session. Reload before reordering.",
      };
    }
    return {
      success: false,
      message: rpcErr.message || "Failed to reorder products.",
    };
  }

  await revalidateMerchandisingCaches({ reorderedProducts: true });

  const total = rpcRes?.[0]?.total_reordered ?? desiredIds.length;

  return {
    success: true,
    message: `Successfully reordered ${total} products.`,
    data: {
      success: rpcRes?.[0]?.success ?? true,
      totalReordered: total,
    },
  };
}

/**
 * Server Action: Atomically reorder collections
 * Invokes public.reorder_collections RPC under transaction advisory lock
 * with complete set validation and snapshot concurrency protection.
 */
export async function reorderCollectionsAction(
  rawInput: unknown
): Promise<ActionResponse<{ success: boolean; totalReordered: number }>> {
  await requireAdmin();
  const supabase = await createClient();

  const parsed = reorderCollectionsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid reorder parameters.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { desiredIds, expectedIds } = parsed.data;

  const { data: rpcRes, error: rpcErr } = await supabase.rpc("reorder_collections", {
    p_ordered_ids: desiredIds,
    p_expected_order: expectedIds,
  });

  if (rpcErr) {
    if (
      rpcErr.message.includes("Conflict") ||
      rpcErr.message.includes("changed in another session")
    ) {
      return {
        success: false,
        message: "Collection order changed in another session. Reload before reordering.",
      };
    }
    return {
      success: false,
      message: rpcErr.message || "Failed to reorder collections.",
    };
  }

  await revalidateMerchandisingCaches({ reorderedCollections: true });

  const total = rpcRes?.[0]?.total_reordered ?? desiredIds.length;

  return {
    success: true,
    message: `Successfully reordered ${total} collections.`,
    data: {
      success: rpcRes?.[0]?.success ?? true,
      totalReordered: total,
    },
  };
}
