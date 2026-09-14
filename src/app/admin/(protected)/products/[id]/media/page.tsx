import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { ProductMediaGallery } from "@/components/admin/media/ProductMediaGallery";
import { MediaUploader } from "@/components/admin/media/MediaUploader";
import { OrphanCleanupSection } from "@/components/admin/media/OrphanCleanupSection";
import { Tables } from "@/types/database.types";

interface ProductMediaPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductMediaPage({ params }: ProductMediaPageProps) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createClient();

  // Fetch product
  const { data: product, error: prodErr } = await supabase
    .from("products")
    .select("id, slug, name, legacy_id, is_active, price, currency_symbol")
    .eq("id", id)
    .single();

  if (prodErr || !product) {
    notFound();
  }

  // Fetch all images for product ordered by sort_order
  const { data: images, error: imgErr } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const productImages = (images || []) as Tables<"product_images">[];

  return (
    <div className="space-y-6 pb-12">
      {/* Breadcrumb & Top Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-mono text-vantaire-muted">
          <Link href="/admin/products" className="hover:text-vantaire-sand transition">
            Products
          </Link>
          <span>/</span>
          <Link
            href={`/admin/products/${product.id}/edit`}
            className="hover:text-vantaire-sand transition truncate max-w-xs"
          >
            {product.name}
          </Link>
          <span>/</span>
          <span className="text-vantaire-champagne">Media</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/admin/products/${product.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-vantaire-border text-vantaire-sand hover:text-vantaire-warmWhite hover:border-vantaire-champagne/60 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Product Details</span>
          </Link>
          {product.is_active && (
            <Link
              href={`/products/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-vantaire-border text-vantaire-sand hover:text-vantaire-champagne transition"
            >
              <span>View On Storefront</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Product Summary Banner */}
      <div className="p-5 bg-vantaire-charcoal/40 border border-vantaire-border/80 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-serif text-vantaire-warmWhite font-medium">
              {product.name}
            </h1>
            <span className="font-mono text-xs text-vantaire-muted px-2 py-0.5 border border-vantaire-border">
              {product.legacy_id}
            </span>
          </div>
          <p className="font-mono text-xs text-vantaire-sand">
            Slug: <span className="text-vantaire-muted">{product.slug}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {product.is_active ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Active on Storefront
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertCircle className="w-3 h-3" />
              Archived / Draft
            </span>
          )}
        </div>
      </div>

      {/* Image Gallery */}
      <ProductMediaGallery
        productId={product.id}
        productSlug={product.slug}
        productName={product.name}
        isActive={product.is_active}
        initialImages={productImages}
      />

      {/* Image Uploader */}
      <MediaUploader
        productId={product.id}
        productSlug={product.slug}
        currentImageCount={productImages.length}
      />

      {/* Storage Folder Integrity & Orphan Cleanup */}
      <OrphanCleanupSection productId={product.id} productSlug={product.slug} />
    </div>
  );
}
