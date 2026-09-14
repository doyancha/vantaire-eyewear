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
