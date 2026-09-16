"use server";

import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import {
  createProductSchema,
  updateProductSchema,
  productActionTokenSchema,
  type CreateProductOutput,
  type UpdateProductOutput,
  type ProductActionTokenInput,
} from "@/lib/admin/product-validation";
import { revalidateProductCaches } from "@/lib/admin/revalidate";
import { Tables } from "@/types/database.types";

export type ActionResponse<T = any> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
  conflict?: boolean;
  warning?: string;
};

/**
 * Normalizes either a FormData instance or a raw object into a structured object
 * suitable for Zod validation.
 */
function parseRawPayload(input: unknown): Record<string, any> {
  if (input instanceof FormData) {
    const raw: Record<string, any> = {};
    for (const [key, value] of input.entries()) {
      if (key === "in_stock") {
        raw[key] = value === "true" || value === "on" || value === "1";
      } else {
        raw[key] = value;
      }
    }
    return raw;
  }
  if (typeof input === "object" && input !== null) {
    return { ...(input as Record<string, any>) };
  }
  return {};
}

/**
 * Server Action: Create Product
 * Authenticated via requireAdmin(), validated via createProductSchema,
 * initial state: inactive draft, auto-allocated legacy_id via DB trigger.
 */
export async function createProductAction(
  rawInput: unknown
): Promise<ActionResponse<Tables<"products">>> {
  // 1. Enforce admin/owner authorization
  await requireAdmin();

  // 2. Validate input schema
  const payload = parseRawPayload(rawInput);
  const parseResult = createProductSchema.safeParse(payload);

  if (!parseResult.success) {
    const fieldErrors = parseResult.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Please correct the errors in the form.",
      errors: fieldErrors as Record<string, string[]>,
    };
  }

  const validated: CreateProductOutput = parseResult.data;
  const supabase = await createClient();

  // 3. Verify slug uniqueness prior to insert
  const { data: existingSlug } = await supabase
    .from("products")
    .select("id")
    .eq("slug", validated.slug)
    .maybeSingle();

  if (existingSlug) {
    return {
      success: false,
      message: "A product with this slug already exists. Slugs must be unique.",
      errors: {
        slug: ["This slug is already in use by another product."],
      },
    };
  }

  // 4. Insert product under RLS (authenticated admin session)
  // legacy_id is assigned by DB trigger trg_products_generate_legacy_id
  const { data: inserted, error: insertError } = await supabase
    .from("products")
    .insert({
      slug: validated.slug,
      name: validated.name,
      short_name: validated.short_name,
      category: validated.category,
      gender: validated.gender,
      price: validated.price,
      compare_at_price: validated.compare_at_price,
      currency: "BDT",
      currency_symbol: "৳",
      description: validated.description,
      short_description: validated.short_description,
      frame_shape: validated.frame_shape,
      frame_look: validated.frame_look,
      frame_color: validated.frame_color,
      lens_color: validated.lens_color,
      lens_type: validated.lens_type,
      style_category: validated.style_category,
      fit: validated.fit,
      features: validated.features,
      badge: validated.badge,
      featured: false,
      best_seller: false,
      new_arrival: false,
      in_stock: true,
      is_active: false, // Default to inactive draft on creation
      seo_title: validated.seo_title,
      seo_description: validated.seo_description,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    return {
      success: false,
      message: insertError?.message || "Failed to create product in database.",
    };
  }

  // 5. Revalidate cache tags and routes (draft created inactive -> 0 public flushes)
  const reval = await revalidateProductCaches({ slug: inserted.slug, type: "create", isActive: false });

  return {
    success: true,
    message: !reval.success
      ? `Product "${inserted.name}" created in database, but cache refresh incomplete: ${reval.warning}`
      : `Product "${inserted.name}" created successfully as an inactive draft (${inserted.legacy_id}).`,
    warning: reval.warning,
    data: inserted,
  };
}

/**
 * Server Action: Update Product
 * Authenticated via requireAdmin(), validates optimistic concurrency token,
 * prevents modification of immutable slug and legacy_id.
 */
export async function updateProductAction(
  rawInput: unknown
): Promise<ActionResponse<Tables<"products">>> {
  // 1. Enforce admin/owner authorization
  await requireAdmin();

  // 2. Validate input schema
  const payload = parseRawPayload(rawInput);
  const parseResult = updateProductSchema.safeParse(payload);

  if (!parseResult.success) {
    const fieldErrors = parseResult.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Please correct the errors in the form.",
      errors: fieldErrors as Record<string, string[]>,
    };
  }

  const validated: UpdateProductOutput = parseResult.data;
  const supabase = await createClient();

  // 3. Check current product state and optimistic concurrency token
  const { data: current, error: fetchError } = await supabase
    .from("products")
    .select("id, updated_at, slug, legacy_id")
    .eq("id", validated.id)
    .maybeSingle();

  if (fetchError || !current) {
    return {
      success: false,
      message: "Product not found or access denied.",
    };
  }

  if (current.updated_at !== validated.updated_at) {
    return {
      success: false,
      conflict: true,
      message:
        "Conflict: This product was modified by another user or session. Please refresh the page to view the latest data before saving.",
    };
  }

  // 4. Update product under RLS with optimistic concurrency condition
  const { data: updated, error: updateError } = await supabase
    .from("products")
    .update({
      name: validated.name,
      short_name: validated.short_name,
      category: validated.category,
      gender: validated.gender,
      price: validated.price,
      compare_at_price: validated.compare_at_price,
      description: validated.description,
      short_description: validated.short_description,
      frame_shape: validated.frame_shape,
      frame_look: validated.frame_look,
      frame_color: validated.frame_color,
      lens_color: validated.lens_color,
      lens_type: validated.lens_type,
      style_category: validated.style_category,
      fit: validated.fit,
      features: validated.features,
      badge: validated.badge,
      in_stock: validated.in_stock,
      seo_title: validated.seo_title,
      seo_description: validated.seo_description,
      // slug, legacy_id, is_active, featured, best_seller, new_arrival are NOT modified here
    })
    .eq("id", validated.id)
    .eq("updated_at", validated.updated_at)
    .select()
    .maybeSingle();

  if (updateError) {
    return {
      success: false,
      message: updateError.message,
    };
  }

  if (!updated) {
    return {
      success: false,
      conflict: true,
      message:
        "Conflict: Could not apply update because the product record was updated concurrently. Please refresh.",
    };
  }

  // 5. Revalidate cache tags and routes
  const reval = await revalidateProductCaches({
    slug: updated.slug,
    type: "update",
    isActive: updated.is_active,
  });

  return {
    success: true,
    message: !reval.success
      ? `Product "${updated.name}" updated in database, but cache refresh incomplete: ${reval.warning}`
      : `Product "${updated.name}" updated successfully.`,
    warning: reval.warning,
    data: updated,
  };
}

/**
 * Server Action: Archive Product (Deactivate)
 * Soft-archive only. Changes is_active to false.
 */
export async function archiveProductAction(
  rawToken: unknown
): Promise<ActionResponse<Tables<"products">>> {
  // 1. Enforce admin/owner authorization
  await requireAdmin();

  // 2. Validate action token
  const payload = parseRawPayload(rawToken);
  const parseResult = productActionTokenSchema.safeParse(payload);

  if (!parseResult.success) {
    return {
      success: false,
      message: "Invalid action token provided.",
    };
  }

  const token: ProductActionTokenInput = parseResult.data;
  const supabase = await createClient();

  // 3. Fetch current product and check optimistic concurrency token
  const { data: current, error: fetchError } = await supabase
    .from("products")
    .select("id, updated_at, slug, name, is_active")
    .eq("id", token.id)
    .maybeSingle();

  if (fetchError || !current) {
    return {
      success: false,
      message: "Product not found.",
    };
  }

  if (current.updated_at !== token.updated_at) {
    return {
      success: false,
      conflict: true,
      message: "This product was modified concurrently. Please refresh before archiving.",
    };
  }

  if (!current.is_active) {
    return {
      success: true,
      message: "Product is already archived.",
      data: current as Tables<"products">,
    };
  }

  // 4. Soft archive by setting is_active = false
  const { data: updated, error: updateError } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", token.id)
    .eq("updated_at", token.updated_at)
    .select()
    .maybeSingle();

  if (updateError || !updated) {
    return {
      success: false,
      conflict: !updated,
      message: updateError?.message || "Failed to archive product.",
    };
  }

  // 5. Revalidate cache
  const reval = await revalidateProductCaches({ slug: updated.slug, type: "lifecycle" });

  return {
    success: true,
    message: `Product "${updated.name}" has been archived and hidden from the storefront.`,
    warning: reval.warning,
    data: updated,
  };
}

/**
 * Server Action: Restore Product (Reactivate)
 * Verifies that the product has at least one designated primary image before activating.
 */
export async function restoreProductAction(
  rawToken: unknown
): Promise<ActionResponse<Tables<"products">>> {
  // 1. Enforce admin/owner authorization
  await requireAdmin();

  // 2. Validate action token
  const payload = parseRawPayload(rawToken);
  const parseResult = productActionTokenSchema.safeParse(payload);

  if (!parseResult.success) {
    return {
      success: false,
      message: "Invalid action token provided.",
    };
  }

  const token: ProductActionTokenInput = parseResult.data;
  const supabase = await createClient();

  // 3. Fetch current product and check concurrency token
  const { data: current, error: fetchError } = await supabase
    .from("products")
    .select("id, updated_at, slug, name, is_active")
    .eq("id", token.id)
    .maybeSingle();

  if (fetchError || !current) {
    return {
      success: false,
      message: "Product not found.",
    };
  }

  if (current.updated_at !== token.updated_at) {
    return {
      success: false,
      conflict: true,
      message: "This product was modified concurrently. Please refresh before activating.",
    };
  }

  if (current.is_active) {
    return {
      success: true,
      message: "Product is already active.",
      data: current as Tables<"products">,
    };
  }

  // 4. Verify primary image exists before allowing restoration
  const { data: primaryImage, error: imgError } = await supabase
    .from("product_images")
    .select("id, storage_path")
    .eq("product_id", token.id)
    .eq("is_primary", true)
    .maybeSingle();

  if (imgError || !primaryImage) {
    return {
      success: false,
      message:
        "Cannot activate product: A primary product image is required before activation. Please upload or assign a primary image in the Media Library first.",
    };
  }

  // 5. Restore product: set is_active = true
  const { data: updated, error: updateError } = await supabase
    .from("products")
    .update({ is_active: true })
    .eq("id", token.id)
    .eq("updated_at", token.updated_at)
    .select()
    .maybeSingle();

  if (updateError || !updated) {
    return {
      success: false,
      conflict: !updated,
      message: updateError?.message || "Failed to restore product.",
    };
  }

  // 6. Revalidate cache
  const reval = await revalidateProductCaches({ slug: updated.slug, type: "lifecycle" });

  return {
    success: true,
    message: !reval.success
      ? `Product "${updated.name}" restored in database, but cache refresh incomplete: ${reval.warning}`
      : `Product "${updated.name}" has been restored and is now active on the storefront.`,
    warning: reval.warning,
    data: updated,
  };
}
