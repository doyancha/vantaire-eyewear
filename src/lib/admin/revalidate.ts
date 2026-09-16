import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/data/cache";

interface RevalidateProductOptions {
  slug?: string;
  collectionSlugs?: string[];
}

/**
 * Revalidates public storefront and admin cache tags and paths following a product mutation.
 * Safe to call from server actions. Gracefully catches errors in non-HTTP/test execution contexts.
 */
export async function revalidateProductCaches(options: RevalidateProductOptions = {}) {
  try {
    // 1. Global product and merchandising tags
    revalidateTag(CACHE_TAGS.products);
    revalidateTag(CACHE_TAGS.merchandising);

    // 2. Specific product tag and detail route
    if (options.slug) {
      revalidateTag(CACHE_TAGS.product(options.slug));
      revalidatePath(`/products/${options.slug}`);
    }

    // 3. Related collection tags and listing routes
    if (options.collectionSlugs && options.collectionSlugs.length > 0) {
      for (const colSlug of options.collectionSlugs) {
        revalidateTag(CACHE_TAGS.collection(colSlug));
        revalidatePath(`/collections/${colSlug}`);
      }
    }

    // 4. Storefront dynamic listings and sitemap
    revalidatePath("/shop");
    revalidatePath("/collections");
    revalidatePath("/");
    revalidatePath("/sitemap.xml");

    // 5. Admin backoffice listings
    revalidatePath("/admin/products");
    revalidatePath("/admin");
  } catch (err) {
    // In headless test scripts or isolated execution where Next.js cache context isn't active
    console.warn("[revalidateProductCaches] Cache revalidation notice:", err);
  }
}

interface RevalidateCollectionOptions {
  slug?: string;
}

/**
 * Revalidates public storefront and admin cache tags and paths following a collection mutation.
 */
export async function revalidateCollectionCaches(options: RevalidateCollectionOptions = {}) {
  try {
    // 1. Global collection tag
    revalidateTag(CACHE_TAGS.collections);

    // 2. Specific collection tag and route
    if (options.slug) {
      revalidateTag(CACHE_TAGS.collection(options.slug));
      revalidatePath(`/collections/${options.slug}`);
    }

    // 3. Storefront navigation, listings, and sitemap
    revalidatePath("/collections");
    revalidatePath("/shop");
    revalidatePath("/");
    revalidatePath("/sitemap.xml");

    // 4. Admin backoffice listings
    revalidatePath("/admin/collections");
    revalidatePath("/admin");
  } catch (err) {
    console.warn("[revalidateCollectionCaches] Cache revalidation notice:", err);
  }
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
export async function revalidateMerchandisingCaches(options: RevalidateMerchandisingOptions = {}) {
  try {
    // 1. Global merchandising and product tags
    revalidateTag(CACHE_TAGS.merchandising);
    revalidateTag(CACHE_TAGS.products);

    if (options.reorderedCollections || options.collectionSlug) {
      revalidateTag(CACHE_TAGS.collections);
    }

    if (options.productSlug) {
      revalidateTag(CACHE_TAGS.product(options.productSlug));
      revalidatePath(`/products/${options.productSlug}`);
    }

    if (options.collectionSlug) {
      revalidateTag(CACHE_TAGS.collection(options.collectionSlug));
      revalidatePath(`/collections/${options.collectionSlug}`);
    }

    // 2. Public storefront surfaces affected by merchandising & ordering
    revalidatePath("/");
    revalidatePath("/shop");
    revalidatePath("/collections");
    revalidatePath("/sitemap.xml");

    // 3. Admin backoffice surfaces
    revalidatePath("/admin/merchandising");
    revalidatePath("/admin/products");
    revalidatePath("/admin/collections");
    revalidatePath("/admin");
  } catch (err) {
    console.warn("[revalidateMerchandisingCaches] Cache revalidation notice:", err);
  }
}
