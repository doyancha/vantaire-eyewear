import { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { MerchandisingWorkspace } from "@/components/admin/merchandising/MerchandisingWorkspace";
import {
  AdminProductMerchandisingRow,
  AdminCollectionOrderingRow,
} from "@/components/admin/merchandising/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Merchandising | VANTAIRE Admin",
  description:
    "Curate homepage showcases, configure Featured and Best Seller tiers, and sequence global catalog order.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminMerchandisingPage() {
  await requireAdmin();
  const supabase = await createClient();

  // 1. Fetch products ordered by global sort_order ASC
  const { data: rawProducts, error: prodErr } = await supabase
    .from("products")
    .select(`
      id,
      legacy_id,
      slug,
      name,
      is_active,
      in_stock,
      badge,
      featured,
      best_seller,
      new_arrival,
      sort_order,
      updated_at,
      product_images (
        storage_path,
        is_primary,
        sort_order
      )
    `)
    .order("sort_order", { ascending: true });

  if (prodErr) {
    throw new Error(`Failed to load products for merchandising: ${prodErr.message}`);
  }

  // 2. Fetch collections ordered by global sort_order ASC
  const { data: rawCollections, error: colErr } = await supabase
    .from("collections")
    .select(`
      id,
      slug,
      name,
      cover_image,
      is_active,
      sort_order,
      updated_at,
      product_collections (
        product_id
      )
    `)
    .order("sort_order", { ascending: true });

  if (colErr) {
    throw new Error(`Failed to load collections for merchandising: ${colErr.message}`);
  }

  // 3. Map products into AdminProductMerchandisingRow
  const products: AdminProductMerchandisingRow[] = (rawProducts || []).map((p: any) => {
    const images = p.product_images || [];
    const primaryImg = images.find((img: any) => img.is_primary) || images[0];

    return {
      id: p.id,
      legacy_id: p.legacy_id,
      slug: p.slug,
      name: p.name,
      primary_image: primaryImg?.storage_path || null,
      is_active: p.is_active,
      in_stock: p.in_stock,
      badge: p.badge,
      featured: p.featured,
      best_seller: p.best_seller,
      new_arrival: p.new_arrival,
      sort_order: p.sort_order,
      updated_at: p.updated_at,
    };
  });

  // 4. Map collections into AdminCollectionOrderingRow
  const collections: AdminCollectionOrderingRow[] = (rawCollections || []).map((c: any) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    cover_image: c.cover_image,
    is_active: c.is_active,
    sort_order: c.sort_order,
    updated_at: c.updated_at,
    product_count: (c.product_collections || []).length,
  }));

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-2">
        <nav aria-label="Breadcrumb" className="text-xs font-mono text-vantaire-muted">
          <ol className="flex items-center gap-1.5 flex-wrap">
            <li>
              <Link href="/admin" className="hover:text-vantaire-warmWhite transition-colors">
                Admin
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-vantaire-champagne font-medium" aria-current="page">
              Merchandising
            </li>
          </ol>
        </nav>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-vantaire-champagne/10 text-vantaire-champagne border border-vantaire-champagne/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg uppercase tracking-luxury font-semibold text-vantaire-warmWhite">
              Merchandising & Catalog Ordering
            </h1>
            <p className="text-xs text-vantaire-muted">
              Configure Featured and Best Seller tiers, control global storefront sequence, and preview homepage curation in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <MerchandisingWorkspace products={products} collections={collections} />
    </div>
  );
}
