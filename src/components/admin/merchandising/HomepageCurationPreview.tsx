"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Flame,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Glasses,
  Image as ImageIcon,
} from "lucide-react";
import { computeEffectiveHomepageProducts } from "@/lib/merchandising/curation";
import { buildPublicStorageUrl } from "@/lib/data/media";
import { AdminProductMerchandisingRow, AdminCollectionOrderingRow } from "./types";

interface HomepageCurationPreviewProps {
  products: AdminProductMerchandisingRow[];
  collections: AdminCollectionOrderingRow[];
}

export function HomepageCurationPreview({
  products,
  collections,
}: HomepageCurationPreviewProps) {
  // 1. Filter active products for homepage consideration
  const activeProducts = useMemo(
    () => products.filter((p) => p.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [products]
  );

  const activeFeatured = useMemo(
    () => activeProducts.filter((p) => p.featured),
    [activeProducts]
  );

  const activeBestSellers = useMemo(
    () => activeProducts.filter((p) => p.best_seller),
    [activeProducts]
  );

  const activeNewArrivals = useMemo(
    () => activeProducts.filter((p) => p.new_arrival),
    [activeProducts]
  );

  // 2. Compute exact effective homepage products using shared domain helper
  const { effectiveFeatured, effectiveBestSellers } = useMemo(
    () => computeEffectiveHomepageProducts(activeFeatured, activeBestSellers),
    [activeFeatured, activeBestSellers]
  );

  // 3. Active collections ordered by sort_order
  const activeCollections = useMemo(
    () => collections.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [collections]
  );

  // 4. Overlap calculations
  const featuredSlugs = new Set(effectiveFeatured.map((p) => p.slug));
  const overlappingBestSellersCount = activeBestSellers.filter((p) =>
    featuredSlugs.has(p.slug)
  ).length;

  return (
    <div className="space-y-8">
      {/* Metric Counters Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-vantaire-card border border-vantaire-border/40 p-4">
          <div className="flex items-center gap-2 text-vantaire-champagne text-xs font-mono uppercase tracking-luxury">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active Featured</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-vantaire-warmWhite font-mono">
              {activeFeatured.length}
            </span>
            <span className="text-xs text-vantaire-muted">
              (6 in Signature Edit)
            </span>
          </div>
        </div>

        <div className="bg-vantaire-card border border-vantaire-border/40 p-4">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-luxury">
            <Flame className="w-3.5 h-3.5" />
            <span>Active Best Sellers</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-vantaire-warmWhite font-mono">
              {activeBestSellers.length}
            </span>
            <span className="text-xs text-vantaire-muted">
              (6 in Vanguard)
            </span>
          </div>
        </div>

        <div className="bg-vantaire-card border border-vantaire-border/40 p-4">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-mono uppercase tracking-luxury">
            <Glasses className="w-3.5 h-3.5" />
            <span>Active New Arrivals</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-vantaire-warmWhite font-mono">
              {activeNewArrivals.length}
            </span>
            <span className="text-xs text-vantaire-muted">
              catalog metadata
            </span>
          </div>
        </div>

        <div className="bg-vantaire-card border border-vantaire-border/40 p-4">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-luxury">
            <Layers className="w-3.5 h-3.5" />
            <span>Active Silhouettes</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-vantaire-warmWhite font-mono">
              {activeCollections.length}
            </span>
            <span className="text-xs text-vantaire-muted">
              in Shop By Silhouette
            </span>
          </div>
        </div>
      </div>

      {/* UX Curation Warnings */}
      <div className="space-y-3">
        {effectiveFeatured.length < 6 && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold uppercase tracking-luxury">
                Signature Edit Underfilled:
              </span>{" "}
              The homepage Signature Edit section has only {effectiveFeatured.length} of 6 slots filled. Flag at least 6 active products as Featured for optimal luxury storefront presentation.
            </div>
          </div>
        )}

        {effectiveBestSellers.length < 6 && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold uppercase tracking-luxury">
                Vanguard Series Underfilled:
              </span>{" "}
              The Vanguard Series section has only {effectiveBestSellers.length} of 6 slots filled.
              {overlappingBestSellersCount > 0 && (
                <> {overlappingBestSellersCount} best seller{overlappingBestSellersCount > 1 ? "s are" : " is"} excluded because {overlappingBestSellersCount > 1 ? "they are" : "it is"} already rendered in The Signature Edit.</>
              )}
            </div>
          </div>
        )}

        {activeCollections.length === 0 && (
          <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold uppercase tracking-luxury">
                No Active Collections:
              </span>{" "}
              The homepage Shop By Silhouette section has 0 active collections. Activate at least one collection with a valid cover and product membership.
            </div>
          </div>
        )}

        {effectiveFeatured.length === 6 && effectiveBestSellers.length === 6 && activeCollections.length > 0 && (
          <div className="flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Homepage merchandising curation is balanced and completely healthy: 6 Signature Edit slots, 6 Vanguard Series slots (de-duplicated), and {activeCollections.length} curated silhouette categories.
            </span>
          </div>
        )}
      </div>

      {/* SECTION 1: The Signature Edit (Featured Preview) */}
      <div className="border border-vantaire-border/40 bg-vantaire-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-vantaire-border/30 pb-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-luxury text-vantaire-champagne">
              Homepage Section 2 Preview
            </div>
            <h2 className="text-base uppercase tracking-luxury font-semibold text-vantaire-warmWhite">
              The Signature Edit ({effectiveFeatured.length} / 6 Slots)
            </h2>
          </div>
          <Link
            href="/#signature-edit"
            target="_blank"
            className="text-xs font-mono text-vantaire-muted hover:text-vantaire-champagne flex items-center gap-1.5 transition-colors"
          >
            <span>Storefront View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {effectiveFeatured.length === 0 ? (
          <div className="py-8 text-center text-xs text-vantaire-muted font-mono">
            No active products currently flagged as Featured.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {effectiveFeatured.map((prod, idx) => (
              <div
                key={prod.id}
                className="bg-vantaire-black/60 border border-vantaire-border/40 p-2.5 flex flex-col justify-between group hover:border-vantaire-champagne/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="relative aspect-square w-full bg-vantaire-charcoal/40 overflow-hidden">
                    {prod.primary_image ? (
                      <Image
                        src={buildPublicStorageUrl(prod.primary_image)}
                        alt={prod.name}
                        fill
                        sizes="160px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-vantaire-muted">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 text-[10px] font-mono text-vantaire-champagne border border-vantaire-champagne/30">
                      #{idx + 1}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-vantaire-muted truncate">
                      {prod.legacy_id}
                    </div>
                    <div className="text-xs font-medium text-vantaire-warmWhite truncate">
                      {prod.name}
                    </div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-vantaire-border/30 flex items-center justify-between text-[10px] font-mono text-vantaire-muted">
                  <span>Pos: {prod.sort_order}</span>
                  {prod.badge && (
                    <span className="text-vantaire-champagne truncate max-w-[70px]">
                      {prod.badge}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: The Vanguard Series (Best Seller Preview) */}
      <div className="border border-vantaire-border/40 bg-vantaire-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-vantaire-border/30 pb-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-luxury text-amber-400">
              Homepage Section 4 Preview
            </div>
            <h2 className="text-base uppercase tracking-luxury font-semibold text-vantaire-warmWhite">
              The Vanguard Series ({effectiveBestSellers.length} / 6 Slots)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-vantaire-muted">
            De-duplicated against Signature Edit
          </span>
        </div>

        {effectiveBestSellers.length === 0 ? (
          <div className="py-8 text-center text-xs text-vantaire-muted font-mono">
            No active products currently eligible for Best Seller slots.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {effectiveBestSellers.map((prod, idx) => (
              <div
                key={prod.id}
                className="bg-vantaire-black/60 border border-vantaire-border/40 p-2.5 flex flex-col justify-between group hover:border-amber-400/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="relative aspect-square w-full bg-vantaire-charcoal/40 overflow-hidden">
                    {prod.primary_image ? (
                      <Image
                        src={buildPublicStorageUrl(prod.primary_image)}
                        alt={prod.name}
                        fill
                        sizes="160px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-vantaire-muted">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 text-[10px] font-mono text-amber-400 border border-amber-400/30">
                      #{idx + 1}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-vantaire-muted truncate">
                      {prod.legacy_id}
                    </div>
                    <div className="text-xs font-medium text-vantaire-warmWhite truncate">
                      {prod.name}
                    </div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-vantaire-border/30 flex items-center justify-between text-[10px] font-mono text-vantaire-muted">
                  <span>Pos: {prod.sort_order}</span>
                  {prod.badge && (
                    <span className="text-amber-400 truncate max-w-[70px]">
                      {prod.badge}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: Shop By Silhouette (Active Collections Preview) */}
      <div className="border border-vantaire-border/40 bg-vantaire-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-vantaire-border/30 pb-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-luxury text-emerald-400">
              Homepage Section 3 Preview
            </div>
            <h2 className="text-base uppercase tracking-luxury font-semibold text-vantaire-warmWhite">
              Shop By Silhouette ({activeCollections.length} Categories)
            </h2>
          </div>
          <Link
            href="/collections"
            target="_blank"
            className="text-xs font-mono text-vantaire-muted hover:text-vantaire-champagne flex items-center gap-1.5 transition-colors"
          >
            <span>View All</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activeCollections.length === 0 ? (
          <div className="py-8 text-center text-xs text-vantaire-muted font-mono">
            No active collections found.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {activeCollections.map((col, idx) => (
              <div
                key={col.id}
                className="bg-vantaire-black/60 border border-vantaire-border/40 p-2.5 flex flex-col justify-between group hover:border-emerald-400/40 transition-colors"
              >
                <div className="space-y-2">
                  <div className="relative aspect-[4/3] w-full bg-vantaire-charcoal/40 overflow-hidden">
                    {col.cover_image ? (
                      <Image
                        src={buildPublicStorageUrl(col.cover_image)}
                        alt={col.name}
                        fill
                        sizes="160px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-vantaire-muted">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 text-[10px] font-mono text-emerald-400 border border-emerald-400/30">
                      #{idx + 1}
                    </span>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-vantaire-muted truncate">
                      /{col.slug}
                    </div>
                    <div className="text-xs font-medium text-vantaire-warmWhite truncate">
                      {col.name}
                    </div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-vantaire-border/30 flex items-center justify-between text-[10px] font-mono text-vantaire-muted">
                  <span>Pos: {col.sort_order}</span>
                  <span>{col.product_count} items</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
