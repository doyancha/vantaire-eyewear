import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";
import { AdminDashboardData } from "./dashboard-types";

/**
 * Loads read-only catalog, merchandising, media, collection, and settings
 * health metrics for the authenticated Admin Dashboard.
 * 
 * Strict Security Rules:
 * - Requires active administrator or owner session (calls requireAdmin())
 * - Uses cookie-aware authenticated server client enforcing Row Level Security (RLS)
 * - Zero references to SUPABASE_SERVICE_ROLE_KEY
 * - Avoids N+1 waterfalls by executing lean batch queries in parallel
 */
export async function getAdminDashboardData(
  customClient?: SupabaseClient<Database>
): Promise<AdminDashboardData> {
  let supabase: SupabaseClient<Database> = customClient!;
  if (!supabase) {
    // 1. Authorize: guarantees authenticated admin/owner context
    await requireAdmin();
    // 2. Client: authenticated session client with RLS
    supabase = await createClient();
  }

  // 3. Parallel batch queries with explicit projection of needed columns only
  const [productsRes, collectionsRes, imagesRes, membershipsRes, settingsRes] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "id, slug, name, is_active, in_stock, featured, best_seller, new_arrival, seo_title, seo_description"
        ),
      supabase
        .from("collections")
        .select("id, slug, name, is_active, cover_image, sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("product_images")
        .select("id, product_id, is_primary, storage_path"),
      supabase
        .from("product_collections")
        .select("product_id, collection_id"),
      supabase
        .from("site_settings")
        .select(
          "id, whatsapp_number, delivery_fee_inside_dhaka, delivery_fee_outside_dhaka, contact_phone, contact_email"
        )
        .eq("id", 1)
        .maybeSingle(),
    ]);

  // 4. Fail visibly on any database query error
  if (productsRes.error) {
    throw new Error(`Failed to load products for dashboard: ${productsRes.error.message}`);
  }
  if (collectionsRes.error) {
    throw new Error(`Failed to load collections for dashboard: ${collectionsRes.error.message}`);
  }
  if (imagesRes.error) {
    throw new Error(`Failed to load product images for dashboard: ${imagesRes.error.message}`);
  }
  if (membershipsRes.error) {
    throw new Error(`Failed to load collection memberships for dashboard: ${membershipsRes.error.message}`);
  }
  if (settingsRes.error) {
    throw new Error(`Failed to load site settings for dashboard: ${settingsRes.error.message}`);
  }

  const products = productsRes.data || [];
  const collections = collectionsRes.data || [];
  const images = imagesRes.data || [];
  const memberships = membershipsRes.data || [];
  const settingsRow = settingsRes.data;

  // 5. Compute Catalog Metrics
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.is_active).length;
  const inactiveProducts = products.filter((p) => !p.is_active).length;
  const inStockProducts = products.filter((p) => p.in_stock).length;
  const outOfStockProducts = products.filter((p) => !p.in_stock).length;

  // 6. Compute Merchandising Metrics
  const featuredProducts = products.filter((p) => p.featured).length;
  const bestSellers = products.filter((p) => p.best_seller).length;
  const newArrivals = products.filter((p) => p.new_arrival).length;

  // 7. Compute Collection Metrics & Product Counts
  const collectionCountsMap = new Map<string, number>();
  for (const m of memberships) {
    collectionCountsMap.set(
      m.collection_id,
      (collectionCountsMap.get(m.collection_id) || 0) + 1
    );
  }

  const collectionItems = collections.map((col) => ({
    id: col.id,
    name: col.name,
    slug: col.slug,
    isActive: col.is_active,
    productCount: collectionCountsMap.get(col.id) || 0,
    coverImage: col.cover_image,
  }));

  const totalCollections = collections.length;
  const activeCollections = collections.filter((c) => c.is_active).length;
  const inactiveCollections = collections.filter((c) => !c.is_active).length;

  // 8. Compute Media Health Metrics
  const productImagesByProductId = new Map<string, typeof images>();
  for (const img of images) {
    const list = productImagesByProductId.get(img.product_id) || [];
    list.push(img);
    productImagesByProductId.set(img.product_id, list);
  }

  let productsWithPrimaryImage = 0;
  let productsMissingPrimaryImage = 0;
  let productsMissingAnyImage = 0;

  for (const p of products) {
    const pImages = productImagesByProductId.get(p.id) || [];
    if (pImages.length === 0) {
      productsMissingAnyImage++;
      productsMissingPrimaryImage++;
    } else {
      const hasPrimary = pImages.some((img) => img.is_primary);
      if (hasPrimary) {
        productsWithPrimaryImage++;
      } else {
        productsMissingPrimaryImage++;
      }
    }
  }

  // 9. Compute SEO Health Metrics
  let missingTitle = 0;
  let missingDescription = 0;
  let healthyProducts = 0;

  for (const p of products) {
    const hasTitle = Boolean(p.seo_title && p.seo_title.trim().length > 0);
    const hasDesc = Boolean(p.seo_description && p.seo_description.trim().length > 0);

    if (!hasTitle) missingTitle++;
    if (!hasDesc) missingDescription++;
    if (hasTitle && hasDesc) healthyProducts++;
  }

  // 10. Compute Settings Health Metrics
  const hasWhatsapp = Boolean(settingsRow?.whatsapp_number && settingsRow.whatsapp_number.trim().length > 0);
  const hasDeliveryFees =
    settingsRow?.delivery_fee_inside_dhaka != null &&
    settingsRow?.delivery_fee_outside_dhaka != null;

  return {
    catalog: {
      totalProducts,
      activeProducts,
      inactiveProducts,
      inStockProducts,
      outOfStockProducts,
    },
    merchandising: {
      featuredProducts,
      bestSellers,
      newArrivals,
    },
    collections: {
      totalCollections,
      activeCollections,
      inactiveCollections,
      items: collectionItems,
    },
    media: {
      totalImageRecords: images.length,
      productsWithPrimaryImage,
      productsMissingPrimaryImage,
      productsMissingAnyImage,
      isHealthy: productsMissingPrimaryImage === 0 && productsMissingAnyImage === 0,
    },
    seo: {
      healthyProducts,
      missingTitle,
      missingDescription,
      isHealthy: missingTitle === 0 && missingDescription === 0,
    },
    settings: {
      isConfigured: Boolean(settingsRow),
      hasWhatsapp,
      hasDeliveryFees,
      whatsappNumber: settingsRow?.whatsapp_number || "",
      deliveryFeeInsideDhaka: Number(settingsRow?.delivery_fee_inside_dhaka ?? 0),
      deliveryFeeOutsideDhaka: Number(settingsRow?.delivery_fee_outside_dhaka ?? 0),
    },
    renderedAt: new Date().toISOString(),
  };
}
