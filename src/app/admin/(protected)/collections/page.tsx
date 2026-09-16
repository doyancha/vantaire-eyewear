import { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";
import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { CollectionTable, AdminCollectionRow } from "@/components/admin/collections/CollectionTable";

export const metadata: Metadata = {
  title: "Collections | VANTAIRE Admin",
  description: "Curate silhouettes, manage product memberships, and configure collection covers.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminCollectionsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: rawCollections, error } = await supabase
    .from("collections")
    .select(`
      id,
      slug,
      name,
      tagline,
      description,
      cover_image,
      is_active,
      sort_order,
      updated_at,
      product_collections (
        product_id,
        products (
          is_active
        )
      )
    `)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load collections: ${error.message}`);
  }

  const collections: AdminCollectionRow[] = (rawCollections || []).map((col: any) => {
    const memberships = col.product_collections || [];
    const productCount = memberships.length;
    const activeProductCount = memberships.filter(
      (m: any) => m.products?.is_active === true
    ).length;

    return {
      id: col.id,
      slug: col.slug,
      name: col.name,
      tagline: col.tagline,
      description: col.description,
      cover_image: col.cover_image,
      is_active: col.is_active,
      sort_order: col.sort_order,
      updated_at: col.updated_at,
      product_count: productCount,
      active_product_count: activeProductCount,
    };
  });

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
              Collections
            </li>
          </ol>
        </nav>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-vantaire-champagne/10 text-vantaire-champagne border border-vantaire-champagne/20 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg uppercase tracking-luxury font-semibold text-vantaire-warmWhite">
              Collections Management
            </h1>
            <p className="text-xs text-vantaire-muted">
              Organize eyewear catalog into curated silhouettes, manage membership order, and control cover media.
            </p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <CollectionTable collections={collections} />
    </div>
  );
}
