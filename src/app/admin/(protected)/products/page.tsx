import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { ProductTable, AdminProductRow } from "@/components/admin/ProductTable";
import { MetricCard } from "@/components/admin/MetricCard";
import { Glasses, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Products Management | VANTAIRE Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminProductsPage() {
  // Enforce admin/owner authorization
  await requireAdmin();

  const supabase = await createClient();

  // 1. Fetch all products under RLS
  const { data: rawProducts, error: prodErr } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (prodErr) {
    throw new Error(`Failed to load catalog products: ${prodErr.message}`);
  }

  const products = rawProducts || [];

  // 2. Fetch primary images
  const { data: primaryImages } = await supabase
    .from("product_images")
    .select("product_id, storage_path")
    .eq("is_primary", true);

  const primaryImageMap = new Map<string, string>();
  if (primaryImages) {
    primaryImages.forEach((img) => {
      primaryImageMap.set(img.product_id, img.storage_path);
    });
  }

  // 3. Fetch collection associations
  const { data: rels } = await supabase
    .from("product_collections")
    .select("product_id, collection:collections(name)");

  const collectionNamesMap = new Map<string, string[]>();
  if (rels) {
    rels.forEach((r: any) => {
      if (r.collection?.name) {
        const list = collectionNamesMap.get(r.product_id) || [];
        list.push(r.collection.name);
        collectionNamesMap.set(r.product_id, list);
      }
    });
  }

  // Map into UI row format
  const rows: AdminProductRow[] = products.map((p) => ({
    id: p.id,
    legacy_id: p.legacy_id,
    slug: p.slug,
    name: p.name,
    short_name: p.short_name,
    category: p.category,
    gender: p.gender,
    price: p.price,
    compare_at_price: p.compare_at_price,
    currency_symbol: p.currency_symbol,
    frame_shape: p.frame_shape,
    in_stock: p.in_stock,
    is_active: p.is_active,
    featured: p.featured,
    best_seller: p.best_seller,
    new_arrival: p.new_arrival,
    badge: p.badge,
    updated_at: p.updated_at,
    primary_image_path: primaryImageMap.get(p.id) || null,
    collection_names: collectionNamesMap.get(p.id) || [],
  }));

  // Summary Metrics
  const totalProducts = rows.length;
  const activeProducts = rows.filter((r) => r.is_active).length;
  const inactiveProducts = rows.filter((r) => !r.is_active).length;
  const outOfStockProducts = rows.filter((r) => !r.in_stock).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-serif tracking-wider text-vantaire-warmWhite font-semibold">
          Products Management
        </h1>
        <p className="text-xs text-vantaire-sand mt-1">
          Catalog inventory, publication status, pricing, and operational specifications.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Products"
          value={totalProducts}
          subtitle="All registered catalog items"
          icon={Glasses}
        />
        <MetricCard
          label="Active Products"
          value={activeProducts}
          subtitle="Visible on public storefront"
          icon={CheckCircle2}
          statusBadge={{ text: "Live", variant: "success" }}
        />
        <MetricCard
          label="Inactive Drafts"
          value={inactiveProducts}
          subtitle="Hidden / archived items"
          icon={XCircle}
          statusBadge={
            inactiveProducts > 0
              ? { text: "Archived", variant: "warning" }
              : undefined
          }
        />
        <MetricCard
          label="Out of Stock"
          value={outOfStockProducts}
          subtitle="Ordering disabled"
          icon={AlertTriangle}
          statusBadge={
            outOfStockProducts > 0
              ? { text: "Restock Needed", variant: "warning" }
              : undefined
          }
        />
      </div>

      {/* Product Table */}
      <ProductTable products={rows} />
    </div>
  );
}
