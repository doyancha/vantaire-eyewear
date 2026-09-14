import { unstable_cache } from "next/cache";

/**
 * Cache Architecture & Revalidation Tags
 * -----------------------------------------------------------------------------
 * Canonical cache tags and revalidation constants for Next.js App Router.
 * Public catalog reads are cached independently of user sessions.
 */

export const CACHE_TAGS = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
  collections: "collections",
  collection: (slug: string) => `collection:${slug}`,
  siteSettings: "site-settings",
  merchandising: "merchandising",
} as const;

// Default revalidation TTL: 1 hour (3600 seconds)
export const DEFAULT_CACHE_TTL = 3600;

/**
 * Higher-order helper to wrap an asynchronous data function with Next.js unstable_cache.
 * Differentiates successful data from thrown errors to ensure failures are never cached.
 */
export function createCachedStorefrontFunction<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  keyParts: string[],
  options: {
    tags: string[];
    revalidate?: number;
  }
): (...args: Args) => Promise<T> {
  return unstable_cache(fn, keyParts, {
    tags: options.tags,
    revalidate: options.revalidate ?? DEFAULT_CACHE_TTL,
  });
}
