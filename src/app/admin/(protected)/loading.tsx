export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse motion-reduce:animate-none">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-vantaire-border/80">
        <div className="space-y-2">
          <div className="h-8 w-40 bg-vantaire-charcoal rounded-none" />
          <div className="h-3 w-64 bg-vantaire-charcoal/60 rounded-none" />
        </div>
        <div className="h-3 w-32 bg-vantaire-charcoal/40 rounded-none" />
      </div>

      {/* Toolbar Skeleton */}
      <div className="h-12 w-full bg-vantaire-charcoal/40 border border-vantaire-border/60" />

      {/* KPI Cards Skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-48 bg-vantaire-charcoal/60" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-vantaire-charcoal/30 border border-vantaire-border/60 p-5 space-y-3"
            >
              <div className="h-3 w-20 bg-vantaire-charcoal/80" />
              <div className="h-8 w-16 bg-vantaire-charcoal" />
            </div>
          ))}
        </div>
      </div>

      {/* Secondary Metrics Skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-48 bg-vantaire-charcoal/60" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-vantaire-charcoal/30 border border-vantaire-border/60 p-5 space-y-3"
            >
              <div className="h-3 w-20 bg-vantaire-charcoal/80" />
              <div className="h-8 w-16 bg-vantaire-charcoal" />
            </div>
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="h-64 w-full bg-vantaire-charcoal/20 border border-vantaire-border/60" />
    </div>
  );
}
