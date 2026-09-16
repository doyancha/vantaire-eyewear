"use server";

import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import {
  createCollectionSchema,
  updateCollectionSchema,
  collectionLifecycleSchema,
  saveCollectionMembershipSchema,
  CreateCollectionInput,
  UpdateCollectionInput,
  CollectionLifecycleInput,
  SaveCollectionMembershipInput,
} from "@/lib/admin/collection-validation";
import {
  validateImageUpload,
  buildCollectionCoverStoragePath,
} from "@/lib/admin/media-validation";
import { revalidateCollectionCaches } from "@/lib/admin/revalidate";
import { ActionResponse } from "@/lib/admin/product-actions";
import { Tables } from "@/types/database.types";
import crypto from "crypto";

export interface CollectionCoverOrphanInfo {
  name: string;
  storagePath: string;
  size: number;
  createdAt: string;
}

/**
 * Normalizes FormData or raw object into a structured object for Zod validation.
 */
function parseRawPayload(input: unknown): Record<string, any> {
  if (input instanceof FormData) {
    const raw: Record<string, any> = {};
    for (const [key, value] of input.entries()) {
      raw[key] = value;
    }
    return raw;
  }
  if (typeof input === "object" && input !== null) {
    return { ...(input as Record<string, any>) };
  }
  return {};
}

/**
 * Server Action: Create Collection (as an inactive draft)
 */
export async function createCollectionAction(
  rawInput: unknown
): Promise<ActionResponse<Tables<"collections">>> {
  await requireAdmin();
  const supabase = await createClient();

  const payload = parseRawPayload(rawInput);
  const parsed = createCollectionSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the errors below.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const validated = parsed.data;

  // Verify slug uniqueness before insert
  const { data: existingSlug } = await supabase
    .from("collections")
    .select("id")
    .eq("slug", validated.slug)
    .maybeSingle();

  if (existingSlug) {
    return {
      success: false,
      message: `A collection with slug '${validated.slug}' already exists.`,
      errors: { slug: [`Slug '${validated.slug}' is already taken.`] },
    };
  }

  // Calculate next sort_order
  const { data: allCollections } = await supabase
    .from("collections")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSortOrder = allCollections && allCollections.length > 0
    ? (allCollections[0].sort_order ?? 0) + 1
    : 0;

  const { data, error } = await supabase
    .from("collections")
    .insert({
      name: validated.name,
      slug: validated.slug,
      tagline: validated.tagline,
      description: validated.description,
      cover_image: null,
      is_active: false,
      sort_order: nextSortOrder,
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      message: `Database error creating collection: ${error.message}`,
    };
  }

  const reval = await revalidateCollectionCaches({ slug: data.slug, type: "create", isActive: false });

  return {
    success: true,
    message: !reval.success
      ? `Collection draft '${data.name}' created in database, but cache refresh incomplete: ${reval.warning}`
      : `Collection draft '${data.name}' created successfully.`,
    warning: reval.warning,
    data,
  };
}

/**
 * Server Action: Update Collection Core Metadata (Slug is immutable)
 */
export async function updateCollectionAction(
  rawInput: unknown
): Promise<ActionResponse<Tables<"collections">>> {
  await requireAdmin();
  const supabase = await createClient();

  const payload = parseRawPayload(rawInput);
  const parsed = updateCollectionSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the errors below.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const validated = parsed.data;

  // Optimistic concurrency check
  const { data: current, error: fetchErr } = await supabase
    .from("collections")
    .select("id, updated_at, slug")
    .eq("id", validated.id)
    .maybeSingle();

  if (fetchErr || !current) {
    return {
      success: false,
      message: "Collection not found.",
    };
  }

  if (current.updated_at !== validated.updated_at) {
    return {
      success: false,
      conflict: true,
      message: "Conflict: Collection was modified by another user. Please refresh and try again.",
    };
  }

  const { data, error } = await supabase
    .from("collections")
    .update({
      name: validated.name,
      tagline: validated.tagline,
      description: validated.description,
    })
    .eq("id", validated.id)
    .eq("updated_at", validated.updated_at)
    .select()
    .maybeSingle();

  if (error) {
    return {
      success: false,
      message: `Failed to update collection: ${error.message}`,
    };
  }

  if (!data) {
    return {
      success: false,
      conflict: true,
      message: "Conflict: Collection was modified concurrently. Please refresh.",
    };
  }

  const reval = await revalidateCollectionCaches({ slug: data.slug, type: "update", isActive: data.is_active });

  return {
    success: true,
    message: !reval.success
      ? `Collection '${data.name}' updated in database, but cache refresh incomplete: ${reval.warning}`
      : `Collection '${data.name}' updated successfully.`,
    warning: reval.warning,
    data,
  };
}

/**
 * Server Action: Archive Collection (Deactivate)
 */
export async function archiveCollectionAction(
  rawInput: unknown
): Promise<ActionResponse<Tables<"collections">>> {
  await requireAdmin();
  const supabase = await createClient();

  const payload = parseRawPayload(rawInput);
  const parsed = collectionLifecycleSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid archive request payload.",
    };
  }

  const token = parsed.data;

  const { data: current, error: fetchErr } = await supabase
    .from("collections")
    .select("id, updated_at, slug, name, is_active")
    .eq("id", token.id)
    .maybeSingle();

  if (fetchErr || !current) {
    return { success: false, message: "Collection not found." };
  }

  if (current.updated_at !== token.updated_at) {
    return {
      success: false,
      conflict: true,
      message: "Conflict: Collection was modified by another operation. Please refresh.",
    };
  }

  if (!current.is_active) {
    return {
      success: false,
      message: "Collection is already archived.",
    };
  }

  const { data, error } = await supabase
    .from("collections")
    .update({ is_active: false })
    .eq("id", token.id)
    .eq("updated_at", token.updated_at)
    .select()
    .maybeSingle();

  if (error) {
    return {
      success: false,
      message: `Failed to archive collection: ${error.message}`,
    };
  }

  if (!data) {
    return {
      success: false,
      conflict: true,
      message: "Conflict: Collection was modified concurrently. Please refresh.",
    };
  }

  const reval = await revalidateCollectionCaches({ slug: data.slug, type: "lifecycle" });

  return {
    success: true,
    message: !reval.success
      ? `Collection '${data.name}' archived in database, but cache refresh incomplete: ${reval.warning}`
      : `Collection '${data.name}' archived successfully.`,
    warning: reval.warning,
    data,
  };
}

/**
 * Server Action: Restore Collection (Activate)
 */
export async function restoreCollectionAction(
  rawInput: unknown
): Promise<ActionResponse<Tables<"collections">>> {
  await requireAdmin();
  const supabase = await createClient();

  const payload = parseRawPayload(rawInput);
  const parsed = collectionLifecycleSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid restore request payload.",
    };
  }

  const token = parsed.data;

  const { data: current, error: fetchErr } = await supabase
    .from("collections")
    .select("id, updated_at, slug, name, is_active, cover_image")
    .eq("id", token.id)
    .maybeSingle();

  if (fetchErr || !current) {
    return { success: false, message: "Collection not found." };
  }

  if (current.updated_at !== token.updated_at) {
    return {
      success: false,
      conflict: true,
      message: "Conflict: Collection was modified by another operation. Please refresh.",
    };
  }

  if (current.is_active) {
    return {
      success: false,
      message: "Collection is already active.",
    };
  }

  // Guard 1: Must have a cover image
  if (!current.cover_image || current.cover_image.trim().length === 0) {
    return {
      success: false,
      message: "Cannot activate collection without a cover image. Please upload a cover image first.",
    };
  }

  // Guard 2: Must have at least one product and at least one active product
  const { data: members, error: memErr } = await supabase
    .from("product_collections")
    .select("product_id, products!inner(is_active)")
    .eq("collection_id", token.id);

  if (memErr) {
    return {
      success: false,
      message: `Failed to inspect collection products: ${memErr.message}`,
    };
  }

  if (!members || members.length === 0) {
    return {
      success: false,
      message: "Cannot activate collection without assigned products. Please assign at least one product.",
    };
  }

  const activeMembers = members.filter((m: any) => m.products?.is_active === true);
  if (activeMembers.length === 0) {
    return {
      success: false,
      message: "Cannot activate collection: at least one assigned product must be active in the catalog.",
    };
  }

  const { data, error } = await supabase
    .from("collections")
    .update({ is_active: true })
    .eq("id", token.id)
    .eq("updated_at", token.updated_at)
    .select()
    .maybeSingle();

  if (error) {
    return {
      success: false,
      message: `Failed to restore collection: ${error.message}`,
    };
  }

  if (!data) {
    return {
      success: false,
      conflict: true,
      message: "Conflict: Collection was modified concurrently. Please refresh.",
    };
  }

  const reval = await revalidateCollectionCaches({ slug: data.slug, type: "lifecycle" });

  return {
    success: true,
    message: !reval.success
      ? `Collection '${data.name}' restored in database, but cache refresh incomplete: ${reval.warning}`
      : `Collection '${data.name}' published and restored successfully.`,
    warning: reval.warning,
    data,
  };
}

/**
 * Server Action: Save Collection Product Membership & Ordering
 */
export async function saveCollectionMembershipAction(
  rawInput: unknown
): Promise<ActionResponse<{ memberCount: number; updatedAt: string }>> {
  await requireAdmin();
  const supabase = await createClient();

  const payload = parseRawPayload(rawInput);
  const parseResult = saveCollectionMembershipSchema.safeParse(payload);

  if (!parseResult.success) {
    const fieldErrors = parseResult.error.flatten().fieldErrors;
    return {
      success: false,
      message: "Please correct the errors in the form.",
      errors: fieldErrors as Record<string, string[]>,
    };
  }

  const validated: SaveCollectionMembershipInput = parseResult.data;

  // Call the atomic transactional RPC
  const { data, error } = await supabase.rpc("set_collection_products", {
    p_collection_id: validated.collection_id,
    p_product_ids: validated.product_ids,
    p_expected_updated_at: validated.updated_at,
  });

  if (error) {
    if (
      error.message.includes("Conflict") ||
      error.message.includes("concurrently") ||
      error.message.includes("modified")
    ) {
      return {
        success: false,
        conflict: true,
        message: "Conflict: Collection membership was modified by another operation. Please refresh.",
      };
    }
    return {
      success: false,
      message: `Failed to save collection membership: ${error.message}`,
    };
  }

  const result = data && data.length > 0 ? data[0] : null;

  // Retrieve slug for revalidation
  const { data: coll } = await supabase
    .from("collections")
    .select("slug")
    .eq("id", validated.collection_id)
    .maybeSingle();

  const reval = await revalidateCollectionCaches({ slug: coll?.slug, type: "membership" });

  return {
    success: true,
    message: !reval.success
      ? `Assigned ${result?.member_count ?? validated.product_ids.length} products in database, but cache refresh incomplete: ${reval.warning}`
      : `Assigned ${result?.member_count ?? validated.product_ids.length} products to collection successfully.`,
    warning: reval.warning,
    data: {
      memberCount: result?.member_count ?? validated.product_ids.length,
      updatedAt: result?.updated_at ?? new Date().toISOString(),
    },
  };
}

/**
 * Server Action: Upload Collection Cover Image
 */
export async function uploadCollectionCoverAction(
  formData: FormData
): Promise<ActionResponse<{ storagePath: string; updatedAt: string }>> {
  await requireAdmin();
  const supabase = await createClient();

  const collectionId = formData.get("collectionId") as string;
  const expectedUpdatedAt = formData.get("updatedAt") as string;
  const file = formData.get("file") as File | null;

  if (!collectionId) {
    return { success: false, message: "Collection ID is required." };
  }

  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, message: "Please select an image file to upload." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const validationResult = validateImageUpload(buffer, file.type);
  if (!validationResult.success) {
    return { success: false, message: validationResult.error };
  }

  const { info } = validationResult;

  // Verify collection and concurrency
  const { data: collection, error: collErr } = await supabase
    .from("collections")
    .select("id, slug, updated_at, cover_image")
    .eq("id", collectionId)
    .maybeSingle();

  if (collErr || !collection) {
    return { success: false, message: "Collection not found." };
  }

  if (expectedUpdatedAt && collection.updated_at !== expectedUpdatedAt) {
    return {
      success: false,
      conflict: true,
      message: "Conflict: Collection was modified by another operation. Please refresh.",
    };
  }

  const storagePath = buildCollectionCoverStoragePath(
    collection.slug,
    info.sha256Prefix16,
    info.extension
  );

  // If new cover matches current cover, no-op
  if (collection.cover_image === storagePath) {
    return {
      success: true,
      message: "Cover image is already set to this exact file.",
      data: { storagePath, updatedAt: collection.updated_at },
    };
  }

  // Upload to product-media bucket
  const { error: uploadError } = await supabase.storage
    .from("product-media")
    .upload(storagePath, buffer, {
      contentType: info.mimeType,
      cacheControl: "31536000",
      upsert: true,
    });

  if (uploadError) {
    return {
      success: false,
      message: `Failed to upload image to storage: ${uploadError.message}`,
    };
  }

  // Update DB cover_image pointer
  const { data: updated, error: updateError } = await supabase
    .from("collections")
    .update({ cover_image: storagePath })
    .eq("id", collectionId)
    .eq("updated_at", collection.updated_at)
    .select("id, slug, updated_at")
    .maybeSingle();

  if (updateError || !updated) {
    // Compensate: delete newly uploaded file
    await supabase.storage.from("product-media").remove([storagePath]);
    return {
      success: false,
      conflict: true,
      message: "Conflict: Collection was modified during upload. Operation aborted and storage compensated.",
    };
  }

  const reval = await revalidateCollectionCaches({ slug: updated.slug, type: "cover" });

  return {
    success: true,
    message: !reval.success
      ? `Collection cover image uploaded to database, but cache refresh incomplete: ${reval.warning}`
      : "Collection cover image uploaded successfully.",
    warning: reval.warning,
    data: { storagePath, updatedAt: updated.updated_at },
  };
}

/**
 * Server Action: Replace Collection Cover Image
 */
export async function replaceCollectionCoverAction(
  formData: FormData
): Promise<ActionResponse<{ storagePath: string; updatedAt: string }>> {
  await requireAdmin();
  const supabase = await createClient();

  const collectionId = formData.get("collectionId") as string;
  const expectedUpdatedAt = formData.get("updatedAt") as string;
  const file = formData.get("file") as File | null;

  if (!collectionId) {
    return { success: false, message: "Collection ID is required." };
  }

  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, message: "Please select an image file to upload." };
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const validationResult = validateImageUpload(buffer, file.type);
  if (!validationResult.success) {
    return { success: false, message: validationResult.error };
  }

  const { info } = validationResult;

  const { data: collection, error: collErr } = await supabase
    .from("collections")
    .select("id, slug, updated_at, cover_image")
    .eq("id", collectionId)
    .maybeSingle();

  if (collErr || !collection) {
    return { success: false, message: "Collection not found." };
  }

  if (expectedUpdatedAt && collection.updated_at !== expectedUpdatedAt) {
    return {
      success: false,
      conflict: true,
      message: "Conflict: Collection was modified by another operation. Please refresh.",
    };
  }

  const newStoragePath = buildCollectionCoverStoragePath(
    collection.slug,
    info.sha256Prefix16,
    info.extension
  );

  const oldStoragePath = collection.cover_image;

  // Same bytes check
  if (oldStoragePath === newStoragePath) {
    return {
      success: true,
      message: "New cover is identical to current cover.",
      data: { storagePath: newStoragePath, updatedAt: collection.updated_at },
    };
  }

  // Upload new object first
  const { error: uploadError } = await supabase.storage
    .from("product-media")
    .upload(newStoragePath, buffer, {
      contentType: info.mimeType,
      cacheControl: "31536000",
      upsert: true,
    });

  if (uploadError) {
    return {
      success: false,
      message: `Failed to upload replacement cover: ${uploadError.message}`,
    };
  }

  // Update DB pointer first
  const { data: updated, error: updateError } = await supabase
    .from("collections")
    .update({ cover_image: newStoragePath })
    .eq("id", collectionId)
    .eq("updated_at", collection.updated_at)
    .select("id, slug, updated_at")
    .maybeSingle();

  if (updateError || !updated) {
    // Compensate: remove new object
    await supabase.storage.from("product-media").remove([newStoragePath]);
    return {
      success: false,
      conflict: true,
      message: "Conflict: Collection was modified during replace. Operation aborted.",
    };
  }

  // DB pointer successfully updated! Now safely clean up old object if it's a managed cover
  if (
    oldStoragePath &&
    oldStoragePath.startsWith(`collections/${collection.slug}/`) &&
    oldStoragePath !== newStoragePath
  ) {
    const { error: delErr } = await supabase.storage
      .from("product-media")
      .remove([oldStoragePath]);

    if (delErr) {
      console.warn(`[replaceCollectionCoverAction] Notice: Old storage object ${oldStoragePath} could not be immediately deleted:`, delErr.message);
    }
  }

  const reval = await revalidateCollectionCaches({ slug: updated.slug, type: "cover" });

  return {
    success: true,
    message: !reval.success
      ? `Collection cover image replaced in database, but cache refresh incomplete: ${reval.warning}`
      : "Collection cover image replaced successfully.",
    warning: reval.warning,
    data: { storagePath: newStoragePath, updatedAt: updated.updated_at },
  };
}

/**
 * Server Action: Remove Collection Cover (Only permitted for inactive drafts)
 */
export async function removeCollectionCoverAction(
  rawInput: unknown
): Promise<ActionResponse<{ updatedAt: string }>> {
  await requireAdmin();
  const supabase = await createClient();

  const payload = parseRawPayload(rawInput);
  const collectionId = payload.collectionId || payload.id;
  const expectedUpdatedAt = payload.updatedAt || payload.updated_at;

  if (!collectionId) {
    return { success: false, message: "Collection ID is required." };
  }

  const { data: collection, error: collErr } = await supabase
    .from("collections")
    .select("id, slug, updated_at, is_active, cover_image")
    .eq("id", collectionId)
    .maybeSingle();

  if (collErr || !collection) {
    return { success: false, message: "Collection not found." };
  }

  if (expectedUpdatedAt && collection.updated_at !== expectedUpdatedAt) {
    return {
      success: false,
      conflict: true,
      message: "Conflict: Collection was modified by another operation. Please refresh.",
    };
  }

  // Guard: Active collections CANNOT have their cover image removed!
  if (collection.is_active) {
    return {
      success: false,
      message: "Cannot remove cover image from an active collection. Archive the collection first.",
    };
  }

  const oldStoragePath = collection.cover_image;

  // Transition DB pointer first
  const { data: updated, error: updateError } = await supabase
    .from("collections")
    .update({ cover_image: null })
    .eq("id", collectionId)
    .eq("updated_at", collection.updated_at)
    .select("id, slug, updated_at")
    .maybeSingle();

  if (updateError || !updated) {
    return {
      success: false,
      conflict: true,
      message: "Conflict: Collection was modified concurrently. Please refresh.",
    };
  }

  // Now delete old storage object if it was a managed collection file
  if (
    oldStoragePath &&
    oldStoragePath.startsWith(`collections/${collection.slug}/`)
  ) {
    await supabase.storage.from("product-media").remove([oldStoragePath]);
  }

  const reval = await revalidateCollectionCaches({ slug: updated.slug, type: "cover" });

  return {
    success: true,
    message: !reval.success
      ? `Collection cover image removed from database, but cache refresh incomplete: ${reval.warning}`
      : "Collection cover image removed successfully.",
    warning: reval.warning,
    data: { updatedAt: updated.updated_at },
  };
}

/**
 * Server Action: Detect Orphaned Cover Files in Collection Folder
 */
export async function getCollectionCoverOrphansAction(
  collectionId: string
): Promise<ActionResponse<CollectionCoverOrphanInfo[]>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: collection, error: collErr } = await supabase
    .from("collections")
    .select("id, slug, cover_image")
    .eq("id", collectionId)
    .maybeSingle();

  if (collErr || !collection) {
    return { success: false, message: "Collection not found." };
  }

  const prefix = `collections/${collection.slug}`;
  const { data: files, error: listErr } = await supabase.storage
    .from("product-media")
    .list(prefix);

  if (listErr) {
    return {
      success: false,
      message: `Failed to inspect collection media storage: ${listErr.message}`,
    };
  }

  const currentCover = collection.cover_image;
  const orphans: CollectionCoverOrphanInfo[] = [];

  for (const file of files || []) {
    if (!file.name || file.name === ".emptyFolderPlaceholder") continue;

    const fullPath = `${prefix}/${file.name}`;
    if (fullPath !== currentCover) {
      orphans.push({
        name: file.name,
        storagePath: fullPath,
        size: file.metadata?.size || 0,
        createdAt: file.created_at || "",
      });
    }
  }

  return {
    success: true,
    message: `Found ${orphans.length} orphaned files in collection folder.`,
    data: orphans,
  };
}

/**
 * Server Action: Clean Up Single Orphan File
 */
export async function cleanupCollectionCoverOrphanAction(
  collectionId: string,
  storagePath: string
): Promise<ActionResponse<void>> {
  await requireAdmin();
  const supabase = await createClient();

  // Re-read current collection reference immediately before deletion
  const { data: collection, error: collErr } = await supabase
    .from("collections")
    .select("id, slug, cover_image")
    .eq("id", collectionId)
    .maybeSingle();

  if (collErr || !collection) {
    return { success: false, message: "Collection not found." };
  }

  const expectedPrefix = `collections/${collection.slug}/`;
  if (!storagePath.startsWith(expectedPrefix)) {
    return {
      success: false,
      message: `Path '${storagePath}' is outside the authorized collection storage boundary.`,
    };
  }

  if (collection.cover_image === storagePath) {
    return {
      success: false,
      message: "Safety guard: Cannot delete currently referenced collection cover image.",
    };
  }

  const { error: delErr } = await supabase.storage
    .from("product-media")
    .remove([storagePath]);

  if (delErr) {
    return {
      success: false,
      message: `Failed to remove storage object: ${delErr.message}`,
    };
  }

  return {
    success: true,
    message: `Removed orphaned file '${storagePath}'.`,
  };
}
