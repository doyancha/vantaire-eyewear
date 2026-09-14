import { getAdminDashboardData } from "@/lib/admin/dashboard";
import { CatalogHealthOverview } from "@/components/admin/CatalogHealthOverview";
import { CollectionsTable } from "@/components/admin/CollectionsTable";
import { QuickActions } from "@/components/admin/QuickActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminHomePage() {
  const data = await getAdminDashboardData();

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-vantaire-border/80">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl tracking-tight text-vantaire-warmWhite">
            Overview
          </h1>
          <p className="text-xs text-vantaire-sand/80 mt-1 font-sans">
            Catalog, merchandising, and operational storefront health at a glance.
          </p>
        </div>

        <div className="text-[11px] font-mono text-vantaire-muted">
          Rendered: {new Date(data.renderedAt).toLocaleTimeString()} (Live Session)
        </div>
      </div>

      {/* Quick Navigation Toolbar */}
      <QuickActions />

      {/* Core Health & Metrics */}
      <CatalogHealthOverview data={data} />

      {/* Collections Breakdown Table */}
      <CollectionsTable collections={data.collections.items} />
    </div>
  );
}
