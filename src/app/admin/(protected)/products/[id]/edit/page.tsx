import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EditProductPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Edit Product (${id.slice(0, 8)}) | VANTAIRE Admin`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function AdminEditProductPage({ params }: EditProductPageProps) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();

  // 1. Fetch product by ID
  const { data: product, error: prodErr } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (prodErr || !product) {
    notFound();
  }

  // 2. Fetch primary image
  const { data: primaryImage } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", id)
    .eq("is_primary", true)
    .maybeSingle();

  // 3. Fetch collection names
  const { data: rels } = await supabase
    .from("product_collections")
    .select("collection:collections(name)")
    .eq("product_id", id);

  const collectionNames: string[] = [];
  if (rels) {
    rels.forEach((r: any) => {
      if (r.collection?.name) {
        collectionNames.push(r.collection.name);
      }
    });
  }

  return (
    <ProductForm
      mode="edit"
      initialData={{
        id: product.id,
        legacy_id: product.legacy_id,
        slug: product.slug,
        name: product.name,
        short_name: product.short_name,
        category: product.category,
        gender: product.gender as "Unisex" | "Men" | "Women",
        price: product.price,
        compare_at_price: product.compare_at_price,
        currency: product.currency,
        currency_symbol: product.currency_symbol,
        description: product.description,
        short_description: product.short_description,
        frame_shape: product.frame_shape,
        frame_look: product.frame_look,
        frame_color: product.frame_color,
        lens_color: product.lens_color,
        lens_type: product.lens_type,
        style_category: product.style_category,
        fit: product.fit as "Universal" | "Medium" | "Narrow" | "Wide",
        features: product.features,
        badge: product.badge,
        in_stock: product.in_stock,
        is_active: product.is_active,
        featured: product.featured,
        best_seller: product.best_seller,
        new_arrival: product.new_arrival,
        seo_title: product.seo_title,
        seo_description: product.seo_description,
        updated_at: product.updated_at,
        primary_image_path: primaryImage?.storage_path || null,
        collection_names: collectionNames,
      }}
    />
  );
}
