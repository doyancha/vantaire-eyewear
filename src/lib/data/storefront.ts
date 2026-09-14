import { Product, CollectionMeta, CollectionSlug } from "@/types/catalog";
import { PRODUCTS, COLLECTIONS_META } from "@/data/products";
import { siteConfig } from "@/lib/config";
import { getPublicSupabaseClient } from "@/lib/supabase/public";
import {
  mapDbProduct,
  mapDbCollection,
  mapDbSiteSettings,
  OperationalSettings,
} from "./mappers";
import { getStorefrontDataSource, isStaticFallbackAllowed } from "./config";
import { CACHE_TAGS, DEFAULT_CACHE_TTL } from "./cache";
import { unstable_cache } from "next/cache";

// =============================================================================
// 1. DETERMINISTIC RELATED PRODUCTS SCORING ALGORITHM
// =============================================================================
export function calculateRelatedProducts(
  allProducts: Product[],
  currentSlug: string,
  limit: number = 4
): Product[] {
  const current = allProducts.find((p) => p.slug === currentSlug);
  if (!current) {
    return allProducts.slice(0, limit);
  }

  const candidates = allProducts.filter((p) => p.slug !== currentSlug);

  const scored = candidates.map((item) => {
    let score = 0;
    if (item.frameShape === current.frameShape) score += 4;
    if (item.styleCategory === current.styleCategory) score += 3;
    const sharedCollections = item.collection.filter((c) =>
      current.collection.includes(c)
    );
    score += sharedCollections.length * 2;
    if (item.gender === current.gender || item.gender === "Unisex") score += 1;
    if (Math.abs(item.price - current.price) <= 400) score += 1;
    if (item.bestSeller || item.featured) score += 1;
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
  return scored.slice(0, limit).map((s) => s.item);
}

// =============================================================================
// 2. RAW SUPABASE PROVIDERS (ANONYMOUS ROLE + RLS)
// =============================================================================
async function fetchSupabaseProducts(): Promise<Product[]> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      product_images ( id, storage_path, alt_text, sort_order, is_primary ),
      product_collections ( position, collections ( slug ) )
    `)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch public products from Supabase: ${error.message}`);
  }

  return (data || []).map((row) => mapDbProduct(row));
}

async function fetchSupabaseProductBySlug(slug: string): Promise<Product | null> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      product_images ( id, storage_path, alt_text, sort_order, is_primary ),
      product_collections ( position, collections ( slug ) )
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch product '${slug}' from Supabase: ${error.message}`);
  }

  if (!data) return null;
  return mapDbProduct(data);
}

async function fetchSupabaseCollections(): Promise<CollectionMeta[]> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name, tagline, description, cover_image, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch public collections from Supabase: ${error.message}`);
  }

  return (data || []).map((row) => mapDbCollection(row));
}

async function fetchSupabaseCollectionBySlug(slug: string): Promise<CollectionMeta | null> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("collections")
    .select("id, slug, name, tagline, description, cover_image, is_active, sort_order")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch collection '${slug}' from Supabase: ${error.message}`);
  }

  if (!data) return null;
  return mapDbCollection(data);
}

async function fetchSupabaseProductsByCollection(slug: string): Promise<Product[]> {
  if (slug === "all") {
    return fetchSupabaseProducts();
  }

  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("product_collections")
    .select(`
      position,
      products!inner (
        *,
        product_images ( id, storage_path, alt_text, sort_order, is_primary ),
        product_collections ( position, collections ( slug ) )
      ),
      collections!inner ( slug, is_active )
    `)
    .eq("collections.slug", slug)
    .eq("collections.is_active", true)
    .eq("products.is_active", true)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch products for collection '${slug}': ${error.message}`);
  }

  return (data || []).map((row) => mapDbProduct(row.products));
}

async function fetchSupabaseSiteSettings(): Promise<OperationalSettings> {
  const supabase = getPublicSupabaseClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch site_settings from Supabase: ${error.message}`);
  }

  return mapDbSiteSettings(data || {});
}

// =============================================================================
// 3. CACHED SUPABASE FUNCTIONS (NEXT.JS unstable_cache WITH ISOMORPHIC FALLBACK)
// =============================================================================
function safeCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  parts: string[],
  options?: { tags?: string[]; revalidate?: number | false }
): T {
  try {
    const cached = unstable_cache(fn, parts, options);
    return (async (...args: any[]) => {
      try {
        return await cached(...args);
      } catch (err: any) {
        if (
          err?.message?.includes("incrementalCache missing") ||
          err?.message?.includes("Invariant")
        ) {
          return await fn(...args);
        }
        throw err;
      }
    }) as T;
  } catch {
    return fn;
  }
}

const getCachedSupabaseProducts = safeCache(
  fetchSupabaseProducts,
  ["vantaire-storefront-products"],
  { tags: [CACHE_TAGS.products], revalidate: DEFAULT_CACHE_TTL }
);

const getCachedSupabaseProductBySlug = (slug: string) =>
  safeCache(
    () => fetchSupabaseProductBySlug(slug),
    ["vantaire-storefront-product", slug],
    { tags: [CACHE_TAGS.products, CACHE_TAGS.product(slug)], revalidate: DEFAULT_CACHE_TTL }
  )();

const getCachedSupabaseCollections = safeCache(
  fetchSupabaseCollections,
  ["vantaire-storefront-collections"],
  { tags: [CACHE_TAGS.collections], revalidate: DEFAULT_CACHE_TTL }
);

const getCachedSupabaseCollectionBySlug = (slug: string) =>
  safeCache(
    () => fetchSupabaseCollectionBySlug(slug),
    ["vantaire-storefront-collection", slug],
    { tags: [CACHE_TAGS.collections, CACHE_TAGS.collection(slug)], revalidate: DEFAULT_CACHE_TTL }
  )();

const getCachedSupabaseProductsByCollection = (slug: string) =>
  safeCache(
    () => fetchSupabaseProductsByCollection(slug),
    ["vantaire-storefront-products-collection", slug],
    { tags: [CACHE_TAGS.products, CACHE_TAGS.collection(slug)], revalidate: DEFAULT_CACHE_TTL }
  )();

const getCachedSupabaseSiteSettings = safeCache(
  fetchSupabaseSiteSettings,
  ["vantaire-storefront-settings"],
  { tags: [CACHE_TAGS.siteSettings], revalidate: DEFAULT_CACHE_TTL }
);

// =============================================================================
// 4. STATIC PROVIDERS (CONTROLLED ROLLBACK BASELINE)
// =============================================================================
function getStaticProducts(): Product[] {
  return PRODUCTS;
}

function getStaticProductBySlug(slug: string): Product | null {
  return PRODUCTS.find((p) => p.slug === slug) || null;
}

function getStaticCollections(): CollectionMeta[] {
  return COLLECTIONS_META;
}

function getStaticCollectionBySlug(slug: string): CollectionMeta | null {
  return COLLECTIONS_META.find((c) => c.slug === slug) || null;
}

function getStaticProductsByCollection(slug: string): Product[] {
  if (slug === "all") {
    return PRODUCTS;
  }
  return PRODUCTS.filter((p) => p.collection.includes(slug as CollectionSlug));
}

function getStaticSiteSettings(): OperationalSettings {
  return mapDbSiteSettings({});
}

// =============================================================================
// 5. PUBLIC UNIFIED STOREFRONT DATA API
// =============================================================================

export async function getProducts(): Promise<Product[]> {
  const source = getStorefrontDataSource();
  if (source === "supabase") {
    try {
      return await getCachedSupabaseProducts();
    } catch (err) {
      if (isStaticFallbackAllowed()) {
        console.warn("⚠️ Supabase query failed; static fallback permitted. Using static products.", err);
        return getStaticProducts();
      }
      throw err;
    }
  }
  return getStaticProducts();
}

export async function getActiveProducts(): Promise<Product[]> {
  return getProducts();
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const source = getStorefrontDataSource();
  if (source === "supabase") {
    try {
      return await getCachedSupabaseProductBySlug(slug);
    } catch (err) {
      if (isStaticFallbackAllowed()) {
        console.warn(`⚠️ Supabase query failed for '${slug}'; static fallback permitted.`, err);
        return getStaticProductBySlug(slug);
      }
      throw err;
    }
  }
  return getStaticProductBySlug(slug);
}

export async function getProductSlugs(): Promise<string[]> {
  const products = await getProducts();
  return products.map((p) => p.slug);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => p.featured);
}

export async function getBestSellers(): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => p.bestSeller);
}

export async function getNewArrivals(): Promise<Product[]> {
  const products = await getProducts();
  return products.filter((p) => p.newArrival);
}

export async function getRelatedProducts(currentSlug: string, limit: number = 4): Promise<Product[]> {
  const allProducts = await getProducts();
  return calculateRelatedProducts(allProducts, currentSlug, limit);
}

export async function getCollections(): Promise<CollectionMeta[]> {
  const source = getStorefrontDataSource();
  if (source === "supabase") {
    try {
      return await getCachedSupabaseCollections();
    } catch (err) {
      if (isStaticFallbackAllowed()) {
        console.warn("⚠️ Supabase query failed; static fallback permitted. Using static collections.", err);
        return getStaticCollections();
      }
      throw err;
    }
  }
  return getStaticCollections();
}

export async function getCollectionBySlug(slug: string): Promise<CollectionMeta | null> {
  const source = getStorefrontDataSource();
  if (source === "supabase") {
    try {
      return await getCachedSupabaseCollectionBySlug(slug);
    } catch (err) {
      if (isStaticFallbackAllowed()) {
        console.warn(`⚠️ Supabase query failed for collection '${slug}'; static fallback permitted.`, err);
        return getStaticCollectionBySlug(slug);
      }
      throw err;
    }
  }
  return getStaticCollectionBySlug(slug);
}

export async function getProductsByCollection(slug: string): Promise<Product[]> {
  const source = getStorefrontDataSource();
  if (source === "supabase") {
    try {
      return await getCachedSupabaseProductsByCollection(slug);
    } catch (err) {
      if (isStaticFallbackAllowed()) {
        console.warn(`⚠️ Supabase query failed for collection products '${slug}'; static fallback permitted.`, err);
        return getStaticProductsByCollection(slug);
      }
      throw err;
    }
  }
  return getStaticProductsByCollection(slug);
}

export async function getSiteSettings(): Promise<OperationalSettings> {
  const source = getStorefrontDataSource();
  if (source === "supabase") {
    try {
      return await getCachedSupabaseSiteSettings();
    } catch (err) {
      if (isStaticFallbackAllowed()) {
        console.warn("⚠️ Supabase query failed; static fallback permitted. Using static settings.", err);
        return getStaticSiteSettings();
      }
      throw err;
    }
  }
  return getStaticSiteSettings();
}

// Backward-compatible re-exports for synchronous compatibility when static mode is active
export { PRODUCTS, COLLECTIONS_META } from "@/data/products";
