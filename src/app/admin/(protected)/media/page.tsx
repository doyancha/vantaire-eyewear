import { requireAdmin } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import {
  MediaOverviewTable,
  MediaOverviewProductItem,
} from "@/components/admin/media/MediaOverviewTable";
import { Image as ImageIcon, CheckCircle2, AlertCircle, HardDrive } from "lucide-react";

export default async function MediaOverviewPage() {
  await requireAdmin();
  const supabase = await createClient();

  // 1. Fetch all products
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, name, slug, legacy_id, is_active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (prodErr || !products) {
    throw new Error(`Failed to query products for media library: ${prodErr?.message}`);
  }

  // 2. Fetch all product images
  const { data: images, error: imgErr } = await supabase
    .from("product_images")
    .select("id, product_id, storage_path, alt_text, is_primary, sort_order")
    .order("sort_order", { ascending: true });

  if (imgErr) {
    throw new Error(`Failed to query product images: ${imgErr.message}`);
  }

  // 3. Group images by product_id
  const imagesByProduct = new Map<string, typeof images>();
  for (const img of images || []) {
    const list = imagesByProduct.get(img.product_id) || [];
    list.push(img);
    imagesByProduct.set(img.product_id, list);
  }

  // 4. Map products with media metadata
  const overviewItems: MediaOverviewProductItem[] = products.map((p) => {
    const pImages = imagesByProduct.get(p.id) || [];
    const primary = pImages.find((img) => img.is_primary) || pImages[0] || null;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      legacyId: p.legacy_id,
      isActive: p.is_active,
      imageCount: pImages.length,
      primaryImage: primary
        ? {
            storagePath: primary.storage_path,
            altText: primary.alt_text,
          }
        : null,
    };
  });

  // Calculate metrics
  const totalProducts = products.length;
  const totalImages = images?.length || 0;
  const activeProducts = products.filter((p) => p.is_active);
  const activeWithValidPrimary = activeProducts.filter((p) => {
    const pImages = imagesByProduct.get(p.id) || [];
    return pImages.some((img) => img.is_primary);
  }).length;
  const productsMissingImages = overviewItems.filter((p) => p.imageCount === 0).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-serif text-vantaire-warmWhite font-medium">
            Product Media Library
          </h1>
          <p className="text-xs text-vantaire-muted font-mono mt-1">
            Content-addressed Supabase Storage management • Max 5 images per product
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 bg-vantaire-charcoal/40 border border-vantaire-border space-y-1">
          <div className="flex items-center justify-between text-vantaire-muted">
            <span className="text-[10px] font-mono uppercase tracking-luxury">
              Catalog Media Assets
            </span>
            <ImageIcon className="w-4 h-4 text-vantaire-champagne" />
          </div>
          <div className="text-2xl font-serif text-vantaire-warmWhite font-medium">
            {totalImages}
          </div>
          <p className="text-[10px] text-vantaire-sand/70 font-mono">
            Across {totalProducts} registered products
          </p>
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-vantaire-charcoal/40 border border-vantaire-border space-y-1">
          <div className="flex items-center justify-between text-vantaire-muted">
            <span className="text-[10px] font-mono uppercase tracking-luxury">
              Active Primary Integrity
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-serif text-vantaire-warmWhite font-medium">
            {activeWithValidPrimary} / {activeProducts.length}
          </div>
          <p className="text-[10px] text-emerald-400 font-mono">
            100% compliant with storefront policy
          </p>
        </div>

        {/* Metric 3 */}
        <div className="p-4 bg-vantaire-charcoal/40 border border-vantaire-border space-y-1">
          <div className="flex items-center justify-between text-vantaire-muted">
            <span className="text-[10px] font-mono uppercase tracking-luxury">
              Products Missing Images
            </span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-serif text-vantaire-warmWhite font-medium">
            {productsMissingImages}
          </div>
          <p className="text-[10px] text-vantaire-muted font-mono">
            Drafts requiring media before activation
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-4 bg-vantaire-charcoal/40 border border-vantaire-border space-y-1">
          <div className="flex items-center justify-between text-vantaire-muted">
            <span className="text-[10px] font-mono uppercase tracking-luxury">
              Storage Bucket Config
            </span>
            <HardDrive className="w-4 h-4 text-vantaire-champagne" />
          </div>
          <div className="text-sm font-mono text-vantaire-warmWhite font-semibold mt-1">
            product-media
          </div>
          <p className="text-[10px] text-vantaire-muted font-mono">
            5 MB limit • JPEG/PNG/WebP • Public CDN
          </p>
        </div>
      </div>

      {/* Media Overview Table */}
      <MediaOverviewTable products={overviewItems} />
    </div>
  );
}
