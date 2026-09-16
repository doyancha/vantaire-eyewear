import { unstable_cache } from "next/cache";

/**
 * Cache Architecture & Revalidation Tags
 * -----------------------------------------------------------------------------
 * Canonical cache tags and revalidation constants for Next.js App Router.
 * Public catalog reads are cached independently of user sessions.
 * 
 * Note: Dead "merchandising" tag was removed in Phase 12 audit. Merchandising
 * mutations invalidate the canonical "products" cache tag.
 */

export const CACHE_TAGS = {
  products: "products",
  product: (slug: string) => `product:${slug}`,
  collections: "collections",
  collection: (slug: string) => `collection:${slug}`,
  siteSettings: "site-settings",
} as const;

// Default revalidation TTL: 1 hour (3600 seconds)
export const DEFAULT_CACHE_TTL = 3600;

/**
 * Specifically detects whether an error was caused by Next.js's unstable_cache
 * running outside of an active HTTP/IncrementalCache request context
 * (e.g. during headless scripts, unit tests, or build-time evaluation).
 * 
 * It strictly avoids catching broad programming or database Invariants.
 */
export function isNextCacheContextMissing(err: unknown): boolean {
  if (err && typeof err === "object" && "message" in err) {
    const msg = String((err as { message: unknown }).message || "");
    return msg.includes("incrementalCache missing");
  }
  return false;
}

/**
 * Canonical wrapper to wrap an asynchronous data fetching function with Next.js unstable_cache.
 * Differentiates successful data from thrown errors to ensure failures are never cached.
 * Gracefully executes the raw function if Next.js incrementalCache context is not active,
 * but transparently re-throws any database, network, or business-logic errors.
 */
export function createCachedStorefrontFunction<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  keyParts: string[],
  options: {
    tags: string[];
    revalidate?: number | false;
  }
): (...args: Args) => Promise<T> {
  try {
    const cached = unstable_cache(fn, keyParts, {
      tags: options.tags,
      revalidate: options.revalidate !== undefined ? options.revalidate : DEFAULT_CACHE_TTL,
    });

    return async (...args: Args): Promise<T> => {
      try {
        return await cached(...args);
      } catch (err: unknown) {
        if (isNextCacheContextMissing(err)) {
          return await fn(...args);
        }
        throw err;
      }
    };
  } catch (initErr: unknown) {
    if (isNextCacheContextMissing(initErr)) {
      return fn;
    }
    throw initErr;
  }
}
