import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit } from "lucide-react";
import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import {
  CollectionEditForm,
  CatalogProductSummary,
  CollectionMembershipItem,
} from "@/components/admin/collections/CollectionEditForm";

interface EditCollectionPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EditCollectionPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: collection } = await supabase
    .from("collections")
    .select("name")
    .eq("id", id)
    .maybeSingle();

  const title = collection?.name
    ? `Edit ${collection.name} | VANTAIRE Admin`
    : "Edit Collection | VANTAIRE Admin";

  return {
    title,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function EditCollectionPage({
  params,
}: EditCollectionPageProps) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  // 1. Fetch collection record
  const { data: collection, error: collErr } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (collErr || !collection) {
    notFound();
  }

  // 2. Fetch assigned memberships
  const { data: rawMembers, error: memErr } = await supabase
    .from("product_collections")
    .select("product_id, position")
    .eq("collection_id", id)
    .order("position", { ascending: true });

  if (memErr) {
    throw new Error(`Failed to load collection memberships: ${memErr.message}`);
  }

  const assignedMembers: CollectionMembershipItem[] = (rawMembers || []).map((m) => ({
    product_id: m.product_id,
    position: m.position,
  }));

  // 3. Fetch all catalog products for membership assignment pool
  const { data: rawProducts, error: prodErr } = await supabase
    .from("products")
    .select(`
      id,
      legacy_id,
      name,
      slug,
      is_active,
      in_stock,
      product_images (
        storage_path,
        is_primary
      )
    `)
    .order("legacy_id", { ascending: true });

  if (prodErr) {
    throw new Error(`Failed to load catalog products: ${prodErr.message}`);
  }

  const allCatalogProducts: CatalogProductSummary[] = (rawProducts || []).map((p: any) => {
    const primaryImg = (p.product_images || []).find((img: any) => img.is_primary);
    return {
      id: p.id,
      legacy_id: p.legacy_id,
      name: p.name,
      slug: p.slug,
      is_active: p.is_active,
      in_stock: p.in_stock,
      primary_image_path: primaryImg?.storage_path || null,
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
            <li>
              <Link href="/admin/collections" className="hover:text-vantaire-warmWhite transition-colors">
                Collections
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-vantaire-champagne font-medium truncate max-w-xs" aria-current="page">
              {collection.name}
            </li>
          </ol>
        </nav>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-vantaire-champagne/10 text-vantaire-champagne border border-vantaire-champagne/20 shrink-0">
            <Edit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg uppercase tracking-luxury font-semibold text-vantaire-warmWhite">
              Edit Silhouette: {collection.name}
            </h1>
            <p className="text-xs text-vantaire-muted">
              Configure editorial metadata, cover media, and ordered product membership curation.
            </p>
          </div>
        </div>
      </div>

      {/* Main Edit Form */}
      <CollectionEditForm
        collection={collection}
        assignedMembers={assignedMembers}
        allCatalogProducts={allCatalogProducts}
      />
    </div>
  );
}
