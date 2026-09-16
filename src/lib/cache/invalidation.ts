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
    }
  | {
      type: "product_updated";
      slug: string;
      oldSlug?: string;
      collectionSlugs?: string[];
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
    }
  | {
      type: "collection_updated";
      slug: string;
      oldSlug?: string;
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
 * invalidation plan (tags and paths) for any catalog or settings mutation.
 */
export function buildInvalidationPlan(event: MutationEvent): InvalidationPlan {
  const tags = new Set<string>();
  const paths = new Set<string>();

  switch (event.type) {
    case "product_created": {
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
      paths.add("/admin");
      paths.add("/admin/products");
      break;
    }

    case "product_updated": {
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
      paths.add("/sitemap.xml");
      paths.add("/admin");
      paths.add("/admin/products");
      paths.add("/admin/merchandising");
      break;
    }

    case "product_lifecycle": {
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
      paths.add("/sitemap.xml");
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
      paths.add("/sitemap.xml");
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
      paths.add("/sitemap.xml");
      paths.add("/admin");
      paths.add("/admin/merchandising");
      paths.add("/admin/products");
      break;
    }

    case "collection_created": {
      tags.add(CACHE_TAGS.collections);
      if (event.slug) {
        tags.add(CACHE_TAGS.collection(event.slug));
        paths.add(`/collections/${event.slug}`);
      }
      paths.add("/");
      paths.add("/shop");
      paths.add("/collections");
      paths.add("/sitemap.xml");
      paths.add("/admin");
      paths.add("/admin/collections");
      break;
    }

    case "collection_updated": {
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
      paths.add("/shop");
      paths.add("/collections");
      paths.add("/sitemap.xml");
      paths.add("/admin");
      paths.add("/admin/collections");
      paths.add("/admin/merchandising");
      break;
    }

    case "collection_lifecycle": {
      // Cross-module dependency: Collection activation status affects product badges and filters
      tags.add(CACHE_TAGS.collections);
      tags.add(CACHE_TAGS.products);
      if (event.slug) {
        tags.add(CACHE_TAGS.collection(event.slug));
        paths.add(`/collections/${event.slug}`);
      }
      paths.add("/");
      paths.add("/shop");
      paths.add("/collections");
      paths.add("/sitemap.xml");
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
      paths.add("/sitemap.xml");
      paths.add("/admin");
      paths.add("/admin/collections");
      paths.add("/admin/merchandising");
      break;
    }

    case "collection_reordered": {
      tags.add(CACHE_TAGS.collections);
      paths.add("/");
      paths.add("/shop");
      paths.add("/collections");
      paths.add("/sitemap.xml");
      paths.add("/admin");
      paths.add("/admin/merchandising");
      paths.add("/admin/collections");
      break;
    }

    case "site_settings_updated": {
      tags.add(CACHE_TAGS.siteSettings);
      paths.add("/");
      paths.add("/contact");
      paths.add("/shipping");
      paths.add("/faq");
      paths.add("/returns");
      paths.add("/shop");
      paths.add("/collections");
      paths.add("/sitemap.xml");
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
 * Executes revalidation for all tags and paths in the provided plan.
 * Safe to execute in server actions; catches isolated context warnings
 * without interrupting successful database transactions.
 */
export function applyInvalidationPlan(plan: InvalidationPlan): InvalidationResult {
  const revalidatedTags: string[] = [];
  const revalidatedPaths: string[] = [];
  const warnings: string[] = [];

  for (const tag of plan.tags) {
    try {
      revalidateTag(tag);
      revalidatedTags.push(tag);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`Tag '${tag}': ${msg}`);
    }
  }

  for (const path of plan.paths) {
    try {
      revalidatePath(path);
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
