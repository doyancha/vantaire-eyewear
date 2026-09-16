import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/data/cache";

export interface InvalidationPlan {
  tags: string[];
  paths: string[];
}

export interface InvalidationResult {
  success: boolean;
  revalidatedTags: string[];
  revalidatedPaths: string[];
  warning?: string;
}

export type MutationEvent =
  | {
      type: "product_created";
      slug: string;
      collectionSlugs?: string[];
      isActive?: boolean;
    }
  | {
      type: "product_updated";
      slug: string;
      oldSlug?: string;
      collectionSlugs?: string[];
      isActive?: boolean;
    }
  | {
      type: "product_lifecycle";
      slug: string;
      collectionSlugs?: string[];
    }
  | {
      type: "product_media_updated";
      productId: string;
      slug: string;
    }
  | {
      type: "product_reordered";
    }
  | {
      type: "product_flags_updated";
      slug: string;
    }
  | {
      type: "collection_created";
      slug: string;
      isActive?: boolean;
    }
  | {
      type: "collection_updated";
      slug: string;
      oldSlug?: string;
      isActive?: boolean;
    }
  | {
      type: "collection_cover_updated";
      slug: string;
    }
  | {
      type: "collection_lifecycle";
      slug: string;
    }
  | {
      type: "collection_membership_updated";
      slug: string;
      affectedProductSlugs?: string[];
    }
  | {
      type: "collection_reordered";
    }
  | {
      type: "site_settings_updated";
    };

/**
 * Pure function to construct a deterministic, deduplicated, and sorted
 *
 * Strict dependency model:
 * - Inactive drafts DO NOT invalidate public caches/paths.
 * - /sitemap.xml is ONLY invalidated on product/collection lifecycle (activate/archive).
 * - Dead tags (merchandising) are strictly eliminated.
 * - Collection cover updates do NOT flush the products tag.
 */
export function buildInvalidationPlan(event: MutationEvent): InvalidationPlan {
  const tags = new Set<string>();
  const paths = new Set<string>();

  switch (event.type) {
    case "product_created": {
      // Admin dashboard and inventory surfaces always refresh
      paths.add("/admin");
      paths.add("/admin/products");

      // Inactive draft product creation produces 0 public cache tags / public routes
      if (event.isActive) {
        tags.add(CACHE_TAGS.products);
        if (event.slug) {
          tags.add(CACHE_TAGS.product(event.slug));
          paths.add(`/products/${event.slug}`);
        }
        if (event.collectionSlugs) {
          for (const col of event.collectionSlugs) {
            if (col) {
              tags.add(CACHE_TAGS.collection(col));
              paths.add(`/collections/${col}`);
            }
          }
        }
        paths.add("/");
        paths.add("/shop");
        paths.add("/collections");
        paths.add("/sitemap.xml");
      }
      break;
    }

    case "product_updated": {
      paths.add("/admin");
      paths.add("/admin/products");
      paths.add("/admin/merchandising");

      // Inactive product metadata edits do not flush public storefront
      if (event.isActive !== false) {
        tags.add(CACHE_TAGS.products);
        if (event.slug) {
          tags.add(CACHE_TAGS.product(event.slug));
          paths.add(`/products/${event.slug}`);
        }
        if (event.oldSlug && event.oldSlug !== event.slug) {
          tags.add(CACHE_TAGS.product(event.oldSlug));
          paths.add(`/products/${event.oldSlug}`);
        }
        if (event.collectionSlugs) {
          for (const col of event.collectionSlugs) {
            if (col) {
              tags.add(CACHE_TAGS.collection(col));
              paths.add(`/collections/${col}`);
            }
          }
        }
        paths.add("/");
        paths.add("/shop");
        paths.add("/collections");
      }
      break;
    }

    case "product_lifecycle": {
      // Product activation or archive alters public URL membership -> flushes sitemap
      tags.add(CACHE_TAGS.products);
      if (event.slug) {
        tags.add(CACHE_TAGS.product(event.slug));
        paths.add(`/products/${event.slug}`);
      }
      if (event.collectionSlugs) {
        for (const col of event.collectionSlugs) {
          if (col) {
            tags.add(CACHE_TAGS.collection(col));
            paths.add(`/collections/${col}`);
          }
        }
      }
      paths.add("/");
      paths.add("/shop");
      paths.add("/collections");
      paths.add("/sitemap.xml"); // Mandatory on lifecycle change
      paths.add("/admin");
      paths.add("/admin/products");
      paths.add("/admin/merchandising");
      break;
    }

    case "product_media_updated": {
      tags.add(CACHE_TAGS.products);
      if (event.slug) {
        tags.add(CACHE_TAGS.product(event.slug));
        paths.add(`/products/${event.slug}`);
      }
      paths.add("/");
      paths.add("/shop");
      paths.add("/collections");
      paths.add("/admin");
      paths.add("/admin/products");
      paths.add(`/admin/products/${event.productId}/media`);
      paths.add("/admin/media");
      break;
    }

    case "product_reordered": {
      tags.add(CACHE_TAGS.products);
      paths.add("/");
      paths.add("/shop");
      paths.add("/collections");
      paths.add("/admin");
      paths.add("/admin/merchandising");
      paths.add("/admin/products");
      break;
    }

    case "product_flags_updated": {
      tags.add(CACHE_TAGS.products);
      if (event.slug) {
        tags.add(CACHE_TAGS.product(event.slug));
        paths.add(`/products/${event.slug}`);
      }
      paths.add("/");
      paths.add("/shop");
      paths.add("/collections");
      paths.add("/admin");
      paths.add("/admin/merchandising");
      paths.add("/admin/products");
      break;
    }

    case "collection_created": {
      paths.add("/admin");
      paths.add("/admin/collections");

      // Inactive draft collection creation produces 0 public cache tags / public routes
      if (event.isActive) {
        tags.add(CACHE_TAGS.collections);
        if (event.slug) {
          tags.add(CACHE_TAGS.collection(event.slug));
          paths.add(`/collections/${event.slug}`);
        }
        paths.add("/");
        paths.add("/collections");
        paths.add("/sitemap.xml");
      }
      break;
    }

    case "collection_updated": {
      paths.add("/admin");
      paths.add("/admin/collections");
      paths.add("/admin/merchandising");

      if (event.isActive !== false) {
        tags.add(CACHE_TAGS.collections);
        if (event.slug) {
          tags.add(CACHE_TAGS.collection(event.slug));
          paths.add(`/collections/${event.slug}`);
        }
        if (event.oldSlug && event.oldSlug !== event.slug) {
          tags.add(CACHE_TAGS.collection(event.oldSlug));
          paths.add(`/collections/${event.oldSlug}`);
        }
        paths.add("/");
        paths.add("/collections");
      }
      break;
    }

    case "collection_cover_updated": {
      // Explicit event for cover image upload/replace/remove
      // Flushes collection caches but does NOT touch products or sitemap
      tags.add(CACHE_TAGS.collections);
      if (event.slug) {
        tags.add(CACHE_TAGS.collection(event.slug));
        paths.add(`/collections/${event.slug}`);
      }
      paths.add("/");
      paths.add("/collections");
      paths.add("/admin");
      paths.add("/admin/collections");
      break;
    }

    case "collection_lifecycle": {
      // Cross-module dependency: Collection activation/archive alters public URL membership and product badges
      tags.add(CACHE_TAGS.collections);
      tags.add(CACHE_TAGS.products);
      if (event.slug) {
        tags.add(CACHE_TAGS.collection(event.slug));
        paths.add(`/collections/${event.slug}`);
      }
      paths.add("/");
      paths.add("/shop");
      paths.add("/collections");
      paths.add("/sitemap.xml"); // Mandatory on lifecycle change
      paths.add("/admin");
      paths.add("/admin/collections");
      paths.add("/admin/merchandising");
      break;
    }

    case "collection_membership_updated": {
      // Cross-module dependency: Collection membership alters product_collections join in getProducts()
      tags.add(CACHE_TAGS.collections);
      tags.add(CACHE_TAGS.products);
      if (event.slug) {
        tags.add(CACHE_TAGS.collection(event.slug));
        paths.add(`/collections/${event.slug}`);
      }
      if (event.affectedProductSlugs) {
        for (const p of event.affectedProductSlugs) {
          if (p) {
            tags.add(CACHE_TAGS.product(p));
            paths.add(`/products/${p}`);
          }
        }
      }
      paths.add("/");
      paths.add("/shop");
      paths.add("/collections");
      paths.add("/admin");
      paths.add("/admin/collections");
      paths.add("/admin/merchandising");
      break;
    }

    case "collection_reordered": {
      tags.add(CACHE_TAGS.collections);
      paths.add("/");
      paths.add("/collections");
      paths.add("/admin");
      paths.add("/admin/merchandising");
      paths.add("/admin/collections");
      break;
    }

    case "site_settings_updated": {
      // Settings mutations do NOT change sitemap URLs (base URL is statically derived)
      tags.add(CACHE_TAGS.siteSettings);
      paths.add("/");
      paths.add("/contact");
      paths.add("/shipping");
      paths.add("/faq");
      paths.add("/returns");
      paths.add("/shop");
      paths.add("/collections");
      paths.add("/admin");
      paths.add("/admin/settings");
      break;
    }
  }

  return {
    tags: Array.from(tags).sort(),
    paths: Array.from(paths).sort(),
  };
}

/**
 * Dependency injection options for testing invalidation failure handling
 */
export interface InvalidationExecutorOptions {
  tagRevalidator?: (tag: string) => void;
  pathRevalidator?: (path: string) => void;
}

/**
 * Executes revalidation for all tags and paths in the provided plan.
 * Safe to execute in server actions; catches isolated context warnings
 * without interrupting successful database transactions.
 */
export function applyInvalidationPlan(
  plan: InvalidationPlan,
  options?: InvalidationExecutorOptions
): InvalidationResult {
  const revalidateTagFn = options?.tagRevalidator ?? revalidateTag;
  const revalidatePathFn = options?.pathRevalidator ?? revalidatePath;

  const revalidatedTags: string[] = [];
  const revalidatedPaths: string[] = [];
  const warnings: string[] = [];

  for (const tag of plan.tags) {
    try {
      revalidateTagFn(tag);
      revalidatedTags.push(tag);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`Tag '${tag}': ${msg}`);
    }
  }

  for (const path of plan.paths) {
    try {
      revalidatePathFn(path);
      revalidatedPaths.push(path);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`Path '${path}': ${msg}`);
    }
  }

  const warning = warnings.length > 0 ? warnings.join("; ") : undefined;
  if (warning) {
    console.warn("[applyInvalidationPlan] Revalidation notice:", warning);
  }

  return {
    success: warnings.length === 0,
    revalidatedTags,
    revalidatedPaths,
    warning,
  };
}
