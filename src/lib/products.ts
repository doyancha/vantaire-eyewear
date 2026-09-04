import { PRODUCTS, COLLECTIONS_META } from "@/data/products";
import { Product, CollectionSlug } from "@/types/catalog";

export function getAllProducts(): Product[] {
  return PRODUCTS;
}

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getFeaturedProducts(): Product[] {
  return PRODUCTS.filter((p) => p.featured);
}

export function getBestSellers(): Product[] {
  return PRODUCTS.filter((p) => p.bestSeller);
}

export function getNewArrivals(): Product[] {
  return PRODUCTS.filter((p) => p.newArrival);
}

export function getProductsByCollection(collectionSlug: string): Product[] {
  if (collectionSlug === "all") {
    return PRODUCTS;
  }
  return PRODUCTS.filter((p) =>
    p.collection.includes(collectionSlug as CollectionSlug)
  );
}

export function getRelatedProducts(currentSlug: string, limit: number = 4): Product[] {
  const current = getProductBySlug(currentSlug);
  if (!current) return PRODUCTS.slice(0, limit);

  // Score candidate items based on frameShape, styleCategory, collection overlap, and gender
  const candidates = PRODUCTS.filter((p) => p.slug !== currentSlug);

  const scored = candidates.map((item) => {
    let score = 0;
    if (item.frameShape === current.frameShape) score += 4;
    if (item.styleCategory === current.styleCategory) score += 3;
    const sharedCollections = item.collection.filter((c) => current.collection.includes(c));
    score += sharedCollections.length * 2;
    if (item.gender === current.gender || item.gender === "Unisex") score += 1;
    if (Math.abs(item.price - current.price) <= 400) score += 1;
    if (item.bestSeller || item.featured) score += 1;
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));

  // Return the top scored related products
  return scored.slice(0, limit).map((s) => s.item);
}

export function getCollectionsMeta() {
  return COLLECTIONS_META;
}

export function getCollectionMetaBySlug(slug: string) {
  return COLLECTIONS_META.find((c) => c.slug === slug);
}
