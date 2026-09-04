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
  
  return PRODUCTS
    .filter((p) => p.slug !== currentSlug)
    .filter((p) => 
      p.frameShape === current.frameShape || 
      p.collection.some(c => current.collection.includes(c))
    )
    .slice(0, limit);
}

export function getCollectionsMeta() {
  return COLLECTIONS_META;
}

export function getCollectionMetaBySlug(slug: string) {
  return COLLECTIONS_META.find((c) => c.slug === slug);
}
