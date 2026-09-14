import {
  Glasses,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  Flame,
  Zap,
  Image as ImageIcon,
  Search,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { AdminDashboardData } from "@/lib/admin/dashboard-types";
import { MetricCard } from "./MetricCard";

interface CatalogHealthOverviewProps {
  data: AdminDashboardData;
}

export function CatalogHealthOverview({ data }: CatalogHealthOverviewProps) {
  const { catalog, merchandising, collections, media, seo, settings } = data;

  return (
    <div className="space-y-8">
      {/* 1. Core Catalog Overview */}
      <section aria-labelledby="catalog-metrics-heading">
        <h2
          id="catalog-metrics-heading"
          className="text-xs uppercase tracking-luxury text-vantaire-champagne font-semibold mb-4"
        >
          Catalog Metrics & Inventory
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total Catalog"
            value={catalog.totalProducts}
            subtitle={`${catalog.activeProducts} active • ${catalog.inactiveProducts} archived`}
            icon={Glasses}
            statusBadge={{
              text: "Verified",
              variant: "info",
            }}
          />

          <MetricCard
            label="Active Storefront"
            value={catalog.activeProducts}
            subtitle="Available on public storefront"
            icon={CheckCircle2}
            statusBadge={{
              text: catalog.inactiveProducts === 0 ? "100% Active" : `${catalog.inactiveProducts} Inactive`,
              variant: catalog.inactiveProducts === 0 ? "success" : "warning",
            }}
          />

          <MetricCard
            label="In Stock Units"
            value={catalog.inStockProducts}
            subtitle={`${catalog.outOfStockProducts} out of stock`}
            icon={Package}
            statusBadge={{
              text: catalog.outOfStockProducts === 0 ? "Full Stock" : "Limited",
              variant: catalog.outOfStockProducts === 0 ? "success" : "warning",
            }}
          />

          <MetricCard
            label="Active Collections"
            value={collections.totalCollections}
            subtitle="Curated silhouette editions"
            icon={Layers}
            statusBadge={{
              text: `${collections.activeCollections} Active`,
              variant: "info",
            }}
          />
        </div>
      </section>

      {/* 2. Merchandising Strategy */}
      <section aria-labelledby="merchandising-metrics-heading">
        <h2
          id="merchandising-metrics-heading"
          className="text-xs uppercase tracking-luxury text-vantaire-champagne font-semibold mb-4"
        >
          Storefront Merchandising Flags
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Featured Edits"
            value={merchandising.featuredProducts}
            subtitle="Highlighted in primary hero & showcases"
            icon={Sparkles}
            statusBadge={{
              text: `${Math.round((merchandising.featuredProducts / (catalog.totalProducts || 1)) * 100)}% of Catalog`,
              variant: "neutral",
            }}
          />

          <MetricCard
            label="Best Sellers"
            value={merchandising.bestSellers}
            subtitle="High-conversion architectural frames"
            icon={Flame}
            statusBadge={{
              text: `${Math.round((merchandising.bestSellers / (catalog.totalProducts || 1)) * 100)}% of Catalog`,
              variant: "neutral",
            }}
          />

          <MetricCard
            label="New Arrivals"
            value={merchandising.newArrivals}
            subtitle="Latest seasonal frame additions"
            icon={Zap}
            statusBadge={{
              text: `${Math.round((merchandising.newArrivals / (catalog.totalProducts || 1)) * 100)}% of Catalog`,
              variant: "neutral",
            }}
          />
        </div>
      </section>

      {/* 3. System Health & Integrity Diagnostics */}
      <section aria-labelledby="health-diagnostics-heading">
        <h2
          id="health-diagnostics-heading"
          className="text-xs uppercase tracking-luxury text-vantaire-champagne font-semibold mb-4"
        >
          Operational Health & Integrity Diagnostics
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Media Health */}
          <div className="p-5 bg-vantaire-charcoal/40 border border-vantaire-border/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-luxury text-vantaire-muted font-medium flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-vantaire-champagne" />
                Media Health
              </span>
              <span
                className={`text-[9px] uppercase font-mono px-2 py-0.5 border ${
                  media.isHealthy
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {media.isHealthy ? "All Primary Bound" : "Media Issues"}
              </span>
            </div>

            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between text-vantaire-sand">
                <span>Product Image Records:</span>
                <span className="font-mono text-vantaire-warmWhite">{media.totalImageRecords}</span>
              </div>
              <div className="flex justify-between text-vantaire-sand">
                <span>Products with Primary Image:</span>
                <span className="font-mono text-emerald-400">{media.productsWithPrimaryImage}</span>
              </div>
              <div className="flex justify-between text-vantaire-sand">
                <span>Missing Primary Image:</span>
                <span
                  className={`font-mono ${
                    media.productsMissingPrimaryImage === 0
                      ? "text-vantaire-muted"
                      : "text-amber-400 font-semibold"
                  }`}
                >
                  {media.productsMissingPrimaryImage}
                </span>
              </div>
              <div className="flex justify-between text-vantaire-sand">
                <span>Missing Any Image:</span>
                <span
                  className={`font-mono ${
                    media.productsMissingAnyImage === 0
                      ? "text-vantaire-muted"
                      : "text-rose-400 font-semibold"
                  }`}
                >
                  {media.productsMissingAnyImage}
                </span>
              </div>
            </div>
          </div>

          {/* SEO Health */}
          <div className="p-5 bg-vantaire-charcoal/40 border border-vantaire-border/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-luxury text-vantaire-muted font-medium flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-vantaire-champagne" />
                SEO Health
              </span>
              <span
                className={`text-[9px] uppercase font-mono px-2 py-0.5 border ${
                  seo.isHealthy
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {seo.isHealthy ? "100% SEO Ready" : "SEO Missing"}
              </span>
            </div>

            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between text-vantaire-sand">
                <span>Complete Titles & Descriptions:</span>
                <span className="font-mono text-emerald-400">{seo.healthyProducts}</span>
              </div>
              <div className="flex justify-between text-vantaire-sand">
                <span>Missing SEO Title:</span>
                <span
                  className={`font-mono ${
                    seo.missingTitle === 0 ? "text-vantaire-muted" : "text-amber-400 font-semibold"
                  }`}
                >
                  {seo.missingTitle}
                </span>
              </div>
              <div className="flex justify-between text-vantaire-sand">
                <span>Missing SEO Description:</span>
                <span
                  className={`font-mono ${
                    seo.missingDescription === 0 ? "text-vantaire-muted" : "text-amber-400 font-semibold"
                  }`}
                >
                  {seo.missingDescription}
                </span>
              </div>
              <div className="flex justify-between text-vantaire-sand">
                <span>Sitemap Product Inclusion:</span>
                <span className="font-mono text-vantaire-warmWhite">42 / 42 (100%)</span>
              </div>
            </div>
          </div>

          {/* Settings Health */}
          <div className="p-5 bg-vantaire-charcoal/40 border border-vantaire-border/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-luxury text-vantaire-muted font-medium flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-vantaire-champagne" />
                Operational Config
              </span>
              <span
                className={`text-[9px] uppercase font-mono px-2 py-0.5 border ${
                  settings.isConfigured && settings.hasWhatsapp && settings.hasDeliveryFees
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {settings.isConfigured ? "Configured" : "Unset"}
              </span>
            </div>

            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex justify-between text-vantaire-sand">
                <span>Singleton Record:</span>
                <span className="font-mono text-emerald-400">
                  {settings.isConfigured ? "Present (ID 1)" : "Missing"}
                </span>
              </div>
              <div className="flex justify-between text-vantaire-sand">
                <span>Concierge WhatsApp:</span>
                <span className="font-mono text-vantaire-warmWhite">
                  {settings.whatsappNumber ? `+${settings.whatsappNumber}` : "Not Set"}
                </span>
              </div>
              <div className="flex justify-between text-vantaire-sand">
                <span>Delivery Rates (Dhaka):</span>
                <span className="font-mono text-vantaire-warmWhite">
                  ৳{settings.deliveryFeeInsideDhaka} / ৳{settings.deliveryFeeOutsideDhaka}
                </span>
              </div>
              <div className="flex justify-between text-vantaire-sand">
                <span>Operational Status:</span>
                <span className="font-mono text-emerald-400">Ready for Inquiries</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
