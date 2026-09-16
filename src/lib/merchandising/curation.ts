/**
 * Pure domain logic for homepage merchandising selection.
 * Ensures strict 1:1 parity between public homepage rendering and Admin merchandising previews.
 */

export interface CuratedHomepageProducts<T extends { slug: string }> {
  effectiveFeatured: T[];
  effectiveBestSellers: T[];
}

/**
 * Derives the effective 6-slot Signature Edit (Featured) and 6-slot Vanguard Series (Best Seller)
 * selections. In accordance with VANTAIRE design rules:
 * 1. Signature Edit takes the first 6 active featured products (ordered by sort_order).
 * 2. Vanguard Series takes active best sellers (ordered by sort_order), strictly excluding
 *    any product already rendered in the effective Signature Edit set, capped at 6 slots.
 */
export function computeEffectiveHomepageProducts<T extends { slug: string }>(
  featuredProducts: T[],
  bestSellerProducts: T[]
): CuratedHomepageProducts<T> {
  const effectiveFeatured = featuredProducts.slice(0, 6);
  const featuredSlugs = new Set(effectiveFeatured.map((p) => p.slug));
  const effectiveBestSellers = bestSellerProducts
    .filter((p) => !featuredSlugs.has(p.slug))
    .slice(0, 6);

  return {
    effectiveFeatured,
    effectiveBestSellers,
  };
}
