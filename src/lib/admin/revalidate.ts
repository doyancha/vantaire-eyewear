import {
  buildInvalidationPlan,
  applyInvalidationPlan,
  type MutationEvent,
  type InvalidationResult,
} from "@/lib/cache/invalidation";

export { buildInvalidationPlan, applyInvalidationPlan };
export type { MutationEvent, InvalidationResult };

interface RevalidateProductOptions {
  slug?: string;
  oldSlug?: string;
  collectionSlugs?: string[];
  type?: "create" | "update" | "lifecycle";
  isActive?: boolean;
}

/**
 * Revalidates public storefront and admin cache tags and paths following a product mutation.
 * Safe to call from server actions. Gracefully catches notices in isolated execution contexts.
 */
export async function revalidateProductCaches(
  options: RevalidateProductOptions = {}
): Promise<InvalidationResult> {
  const event: MutationEvent =
    options.type === "create"
      ? {
          type: "product_created",
          slug: options.slug || "",
          collectionSlugs: options.collectionSlugs,
          isActive: options.isActive ?? false,
        }
      : options.type === "lifecycle"
      ? {
          type: "product_lifecycle",
          slug: options.slug || "",
          collectionSlugs: options.collectionSlugs,
        }
      : {
          type: "product_updated",
          slug: options.slug || "",
          oldSlug: options.oldSlug,
          collectionSlugs: options.collectionSlugs,
          isActive: options.isActive ?? true,
        };

  const plan = buildInvalidationPlan(event);
  return applyInvalidationPlan(plan);
}

interface RevalidateCollectionOptions {
  slug?: string;
  oldSlug?: string;
  type?: "create" | "update" | "lifecycle" | "membership" | "cover";
  isActive?: boolean;
  affectedProductSlugs?: string[];
}

/**
 * Revalidates public storefront and admin cache tags and paths following a collection mutation.
 * Guarantees cross-module invalidation on products when membership or lifecycle changes.
 */
export async function revalidateCollectionCaches(
  options: RevalidateCollectionOptions = {}
): Promise<InvalidationResult> {
  let event: MutationEvent;

  if (options.type === "create") {
    event = {
      type: "collection_created",
      slug: options.slug || "",
      isActive: options.isActive ?? false,
    };
  } else if (options.type === "cover") {
    event = {
      type: "collection_cover_updated",
      slug: options.slug || "",
    };
  } else if (options.type === "lifecycle") {
    event = {
      type: "collection_lifecycle",
      slug: options.slug || "",
    };
  } else if (options.type === "membership") {
    event = {
      type: "collection_membership_updated",
      slug: options.slug || "",
      affectedProductSlugs: options.affectedProductSlugs,
    };
  } else {
    event = {
      type: "collection_updated",
      slug: options.slug || "",
      oldSlug: options.oldSlug,
      isActive: options.isActive ?? true,
    };
  }

  const plan = buildInvalidationPlan(event);
  return applyInvalidationPlan(plan);
}

interface RevalidateMerchandisingOptions {
  productSlug?: string;
  collectionSlug?: string;
  reorderedProducts?: boolean;
  reorderedCollections?: boolean;
}

/**
 * Revalidates public storefront and admin cache tags and paths following merchandising modifications
 * (flag changes, product global reordering, or collection global reordering).
 */
export async function revalidateMerchandisingCaches(
  options: RevalidateMerchandisingOptions = {}
): Promise<InvalidationResult> {
  if (options.reorderedCollections) {
    const plan = buildInvalidationPlan({ type: "collection_reordered" });
    return applyInvalidationPlan(plan);
  }

  if (options.reorderedProducts) {
    const plan = buildInvalidationPlan({ type: "product_reordered" });
    return applyInvalidationPlan(plan);
  }

  if (options.productSlug) {
    const plan = buildInvalidationPlan({
      type: "product_flags_updated",
      slug: options.productSlug,
    });
    return applyInvalidationPlan(plan);
  }

  if (options.collectionSlug) {
    const plan = buildInvalidationPlan({
      type: "collection_updated",
      slug: options.collectionSlug,
    });
    return applyInvalidationPlan(plan);
  }

  const plan = buildInvalidationPlan({ type: "product_reordered" });
  return applyInvalidationPlan(plan);
}

/**
 * Revalidates public storefront and admin surfaces following site settings mutations.
 */
export async function revalidateSiteSettingsCaches(): Promise<InvalidationResult> {
  const plan = buildInvalidationPlan({ type: "site_settings_updated" });
  return applyInvalidationPlan(plan);
}
