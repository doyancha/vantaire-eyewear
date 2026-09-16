"use server";

import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateImageUpload,
  buildProductStoragePath,
  validateAltText,
} from "@/lib/admin/media-validation";
import { buildInvalidationPlan, applyInvalidationPlan } from "@/lib/cache/invalidation";
import { ActionResponse } from "@/lib/admin/product-actions";
import { Tables } from "@/types/database.types";

export interface OrphanFileInfo {
  name: string;
  storagePath: string;
  size: number;
  createdAt: string;
}

/**
 * Server Action: Upload Product Image
 * Enforces:
 * 1. Admin authorization
 * 2. File size (<= 5MB) and genuine magic bytes (JPEG, PNG, WebP)
 * 3. Max 5 images per product
 * 4. Content-addressed storage path: products/{slug}/image-{16hex}.{ext}
 * 5. Automatic primary designation if first image
 * 6. Cache revalidation across storefront and backoffice
 */
export async function uploadProductImageAction(
  formData: FormData
): Promise<ActionResponse<Tables<"product_images">>> {
  await requireAdmin();
  const supabase = await createClient();

  const productId = formData.get("productId") as string;
  const file = formData.get("file") as File | null;
  const altText = (formData.get("altText") as string) || "";
  const makePrimary = formData.get("isPrimary") === "true";

  if (!productId) {
    return { success: false, message: "Product ID is required." };
  }

  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, message: "Please select an image file to upload." };
  }

  // 1. Validate Alt Text
  const altValidation = validateAltText(altText);
  if (!altValidation.success) {
    return { success: false, message: altValidation.error };
  }

  // 2. Fetch Parent Product
  const { data: product, error: prodErr } = await supabase
    .from("products")
    .select("id, slug, is_active")
    .eq("id", productId)
    .single();

  if (prodErr || !product) {
    return { success: false, message: "Target product not found." };
  }

  // 3. Check Current Image Count (Max 5 limit)
  const { count, error: countErr } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if (countErr) {
    return { success: false, message: "Failed to query current image count." };
  }

  if (count !== null && count >= 5) {
    return {
      success: false,
      message: "Product already has the maximum permitted 5 images. Remove an image before uploading a new one.",
    };
  }

  // 4. Validate File Buffer & Magic Bytes
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const validation = validateImageUpload(buffer, file.type);
  if (!validation.success) {
    return { success: false, message: validation.error };
  }

  const { info } = validation;
  const storagePath = buildProductStoragePath(product.slug, info.sha256Prefix16, info.extension);

  // 5. Upload to Supabase Storage Bucket
  const { error: uploadErr } = await supabase.storage
    .from("product-media")
    .upload(storagePath, buffer, {
      contentType: info.mimeType,
      cacheControl: "31536000",
      upsert: true,
    });

  if (uploadErr) {
    return {
      success: false,
      message: `Supabase Storage upload failed: ${uploadErr.message}`,
    };
  }

  // 6. Insert product_images metadata
  const isFirstImage = count === 0;
  const initialIsPrimary = isFirstImage || false;

  const { data: inserted, error: insertErr } = await (supabase.from("product_images") as any)
    .insert({
      product_id: productId,
      storage_path: storagePath,
      alt_text: altValidation.value,
      is_primary: initialIsPrimary,
      sort_order: count ?? 0,
    })
    .select()
    .single();

  if (insertErr || !inserted) {
    // Compensation: delete newly uploaded storage object
    await supabase.storage.from("product-media").remove([storagePath]);
    return {
      success: false,
      message: insertErr?.message || "Failed to record image metadata in database.",
    };
  }

  // 7. If user requested isPrimary on a subsequent image, call RPC
  if (makePrimary && !initialIsPrimary) {
    const { error: rpcErr } = await supabase.rpc("set_product_primary_image", {
      p_product_id: productId,
      p_image_id: inserted.id,
    });
    if (rpcErr) {
      console.warn("Could not set primary image after upload:", rpcErr.message);
    } else {
      inserted.is_primary = true;
    }
  }

  // 8. Revalidate caches
  const reval = applyInvalidationPlan(
    buildInvalidationPlan({
      type: "product_media_updated",
      productId,
      slug: product.slug,
    })
  );

  const warningMsg = !reval.success
    ? (reval.warning || "Some public caches could not be refreshed immediately; stale data may persist briefly.")
    : reval.warning;

  return {
    success: true,
    message: !reval.success
      ? "Image uploaded and cataloged, but cache refresh was incomplete."
      : "Image uploaded and cataloged successfully.",
    warning: warningMsg,
    data: inserted as Tables<"product_images">,
  };
}

/**
 * Server Action: Replace Product Image
 * Uploads new image, updates DB metadata, cleans up old unreferenced storage object,
 * with atomic compensation rollback if DB update fails.
 */
export async function replaceProductImageAction(
  formData: FormData
): Promise<ActionResponse<Tables<"product_images">>> {
  await requireAdmin();
  const supabase = await createClient();

  const productId = formData.get("productId") as string;
  const imageId = formData.get("imageId") as string;
  const file = formData.get("file") as File | null;
  const altText = formData.get("altText") as string | null;

  if (!productId || !imageId) {
    return { success: false, message: "Product ID and Image ID are required." };
  }

  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, message: "Please select a replacement image file." };
  }

  // Fetch current image and parent product
  const { data: currentImage, error: imgErr } = await supabase
    .from("product_images")
    .select("id, storage_path, alt_text, is_primary, product_id, products(slug)")
    .eq("id", imageId)
    .eq("product_id", productId)
    .single();

  if (imgErr || !currentImage) {
    return { success: false, message: "Image record not found." };
  }

  const slug = (currentImage.products as any)?.slug || "unassigned";

  // Validate alt text if provided
  let finalAlt = currentImage.alt_text;
  if (altText !== null && altText !== undefined) {
    const altCheck = validateAltText(altText);
    if (!altCheck.success) {
      return { success: false, message: altCheck.error };
    }
    finalAlt = altCheck.value;
  }

  // Validate file
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const validation = validateImageUpload(buffer, file.type);
  if (!validation.success) {
    return { success: false, message: validation.error };
  }

  const { info } = validation;
  const newStoragePath = buildProductStoragePath(slug, info.sha256Prefix16, info.extension);

  // Upload replacement file
  const { error: uploadErr } = await supabase.storage
    .from("product-media")
    .upload(newStoragePath, buffer, {
      contentType: info.mimeType,
      cacheControl: "31536000",
      upsert: true,
    });

  if (uploadErr) {
    return {
      success: false,
      message: `Supabase Storage upload failed: ${uploadErr.message}`,
    };
  }

  // Update DB metadata
  const { data: updated, error: updateErr } = await (supabase.from("product_images") as any)
    .update({
      storage_path: newStoragePath,
      alt_text: finalAlt,
    })
    .eq("id", imageId)
    .eq("product_id", productId)
    .select()
    .single();

  if (updateErr || !updated) {
    // Compensation: delete newly uploaded file
    await supabase.storage.from("product-media").remove([newStoragePath]);
    return {
      success: false,
      message: updateErr?.message || "Failed to update image record in database.",
    };
  }

  // Clean up old storage file if the path has changed
  if (currentImage.storage_path !== newStoragePath) {
    const { error: oldRemErr } = await supabase.storage
      .from("product-media")
      .remove([currentImage.storage_path]);
    if (oldRemErr) {
      console.warn("Notice: Old storage file cleanup had issue:", oldRemErr.message);
    }
  }

  // Revalidate caches
  const reval = applyInvalidationPlan(
    buildInvalidationPlan({
      type: "product_media_updated",
      productId,
      slug,
    })
  );

  const replaceWarningMsg = !reval.success
    ? (reval.warning || "Some public caches could not be refreshed immediately; stale data may persist briefly.")
    : reval.warning;

  return {
    success: true,
    message: !reval.success
      ? "Image replaced, but cache refresh was incomplete."
      : "Image replaced successfully.",
    warning: replaceWarningMsg,
    data: updated as Tables<"product_images">,
  };
}

/**
 * Server Action: Set Primary Product Image
 * Invokes RPC public.set_product_primary_image with parent row locking.
 */
export async function setPrimaryImageAction(
  productId: string,
  imageId: string
): Promise<ActionResponse> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("set_product_primary_image", {
    p_product_id: productId,
    p_image_id: imageId,
  });

  if (error) {
    return { success: false, message: error.message || "Failed to set primary image." };
  }

  const { data: prod } = await supabase.from("products").select("slug").eq("id", productId).single();
  const reval = applyInvalidationPlan(
    buildInvalidationPlan({
      type: "product_media_updated",
      productId,
      slug: prod?.slug || "",
    })
  );

  const primaryWarning = !reval.success
    ? (reval.warning || "Some public caches could not be refreshed immediately; stale data may persist briefly.")
    : reval.warning;

  return {
    success: true,
    message: !reval.success
      ? "Primary image updated, but cache refresh was incomplete."
      : "Primary image updated successfully.",
    warning: primaryWarning,
  };
}

/**
 * Server Action: Reorder Product Images
 * Invokes RPC public.reorder_product_images with parent row locking and array consistency verification.
 */
export async function reorderProductImagesAction(
  productId: string,
  imageIds: string[]
): Promise<ActionResponse> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.rpc("reorder_product_images", {
    p_product_id: productId,
    p_image_ids: imageIds,
  });

  if (error) {
    return { success: false, message: error.message || "Failed to reorder images." };
  }

  const { data: prod } = await supabase.from("products").select("slug").eq("id", productId).single();
  const reval = applyInvalidationPlan(
    buildInvalidationPlan({
      type: "product_media_updated",
      productId,
      slug: prod?.slug || "",
    })
  );

  const reorderWarning = !reval.success
    ? (reval.warning || "Some public caches could not be refreshed immediately; stale data may persist briefly.")
    : reval.warning;

  return {
    success: true,
    message: !reval.success
      ? "Image order updated, but cache refresh was incomplete."
      : "Image order updated successfully.",
    warning: reorderWarning,
  };
}

/**
 * Server Action: Remove Product Image
 * Invokes RPC public.remove_product_image_metadata, ensures active products cannot reach 0 images,
 * automatically promotes next image to primary if deleted was primary, and deletes the unreferenced storage object.
 */
export async function removeProductImageAction(
  productId: string,
  imageId: string
): Promise<ActionResponse<{ deletedPath?: string; promotedId?: string | null }>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("remove_product_image_metadata", {
    p_product_id: productId,
    p_image_id: imageId,
  });

  if (error) {
    return { success: false, message: error.message || "Failed to remove product image." };
  }

  const deletedRow = Array.isArray(data) ? data[0] : (data as any);
  const deletedPath = deletedRow?.deleted_storage_path;
  const promotedId = deletedRow?.promoted_image_id;

  // Cleanup storage object after successful DB commit
  if (deletedPath) {
    const { error: remErr } = await supabase.storage.from("product-media").remove([deletedPath]);
    if (remErr) {
      console.warn("Storage deletion warning for removed image:", remErr.message);
    }
  }

  const { data: prod } = await supabase.from("products").select("slug").eq("id", productId).single();
  const reval = applyInvalidationPlan(
    buildInvalidationPlan({
      type: "product_media_updated",
      productId,
      slug: prod?.slug || "",
    })
  );

  const removeWarning = !reval.success
    ? (reval.warning || "Some public caches could not be refreshed immediately; stale data may persist briefly.")
    : reval.warning;

  return {
    success: true,
    message: !reval.success
      ? "Image removed, but cache refresh was incomplete."
      : "Image removed successfully.",
    warning: removeWarning,
    data: { deletedPath, promotedId },
  };
}

/**
 * Server Action: Update Image Alt Text
 */
export async function updateImageAltTextAction(
  productId: string,
  imageId: string,
  altText: string
): Promise<ActionResponse> {
  await requireAdmin();
  const altCheck = validateAltText(altText);
  if (!altCheck.success) {
    return { success: false, message: altCheck.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("product_images")
    .update({ alt_text: altCheck.value })
    .eq("id", imageId)
    .eq("product_id", productId);

  if (error) {
    return { success: false, message: error.message || "Failed to update alt text." };
  }

  const { data: prod } = await supabase.from("products").select("slug").eq("id", productId).single();
  const reval = applyInvalidationPlan(
    buildInvalidationPlan({
      type: "product_media_updated",
      productId,
      slug: prod?.slug || "",
    })
  );

  const altWarning = !reval.success
    ? (reval.warning || "Some public caches could not be refreshed immediately; stale data may persist briefly.")
    : reval.warning;

  return {
    success: true,
    message: !reval.success
      ? "Alt text updated, but cache refresh was incomplete."
      : "Alt text updated successfully.",
    warning: altWarning,
  };
}

/**
 * Server Action: Detect Orphan Storage Files for a Product
 * Compares files physically present in products/{slug}/ against DB product_images.
 */
export async function getOrphansForProductAction(
  productId: string
): Promise<ActionResponse<OrphanFileInfo[]>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: product, error: prodErr } = await supabase
    .from("products")
    .select("id, slug")
    .eq("id", productId)
    .single();

  if (prodErr || !product) {
    return { success: false, message: "Product not found." };
  }

  const folder = `products/${product.slug}`;
  const { data: storageObjects, error: listErr } = await supabase.storage
    .from("product-media")
    .list(folder, { limit: 100 });

  if (listErr) {
    return { success: false, message: `Failed to list storage objects: ${listErr.message}` };
  }

  if (!storageObjects || storageObjects.length === 0) {
    return { success: true, message: "No storage files found.", data: [] };
  }

  const { data: registeredImages, error: dbErr } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", productId);

  if (dbErr) {
    return { success: false, message: `Failed to query product images: ${dbErr.message}` };
  }

  const registeredSet = new Set((registeredImages || []).map((img) => img.storage_path));

  const orphans: OrphanFileInfo[] = [];
  for (const obj of storageObjects) {
    if (!obj.name || obj.name === ".emptyFolderPlaceholder") continue;
    const fullPath = `${folder}/${obj.name}`;
    if (!registeredSet.has(fullPath)) {
      orphans.push({
        name: obj.name,
        storagePath: fullPath,
        size: obj.metadata?.size ?? 0,
        createdAt: obj.created_at || "",
      });
    }
  }

  return {
    success: true,
    message: `Found ${orphans.length} unreferenced orphan file(s).`,
    data: orphans,
  };
}

/**
 * Server Action: Clean Up Orphan Storage Files
 * Re-verifies each target against the database to guarantee active DB images can NEVER be deleted.
 */
export async function cleanupProductOrphansAction(
  productId: string,
  filePaths?: string[]
): Promise<ActionResponse<{ deletedCount: number; deletedPaths: string[] }>> {
  await requireAdmin();
  const supabase = await createClient();

  // Re-verify orphans to guarantee active DB images are NEVER deleted!
  const orphansRes = await getOrphansForProductAction(productId);
  if (!orphansRes.success || !orphansRes.data) {
    return { success: false, message: orphansRes.message || "Failed to identify orphan files." };
  }

  const verifiedOrphanMap = new Map(orphansRes.data.map((o) => [o.storagePath, o]));

  const pathsToDelete =
    filePaths && filePaths.length > 0
      ? filePaths.filter((p) => verifiedOrphanMap.has(p))
      : Array.from(verifiedOrphanMap.keys());

  if (pathsToDelete.length === 0) {
    return {
      success: true,
      message: "No orphan files to delete.",
      data: { deletedCount: 0, deletedPaths: [] },
    };
  }

  const { error: removeErr } = await supabase.storage.from("product-media").remove(pathsToDelete);
  if (removeErr) {
    return { success: false, message: `Failed to remove orphan files: ${removeErr.message}` };
  }

  return {
    success: true,
    message: `Successfully cleaned up ${pathsToDelete.length} orphan file(s).`,
    data: { deletedCount: pathsToDelete.length, deletedPaths: pathsToDelete },
  };
}
