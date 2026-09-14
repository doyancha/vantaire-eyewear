import Link from "next/link";
import { ExternalLink, CheckCircle2 } from "lucide-react";
import { CollectionSummary } from "@/lib/admin/dashboard-types";

interface CollectionsTableProps {
  collections: CollectionSummary[];
}

export function CollectionsTable({ collections }: CollectionsTableProps) {
  return (
    <section aria-labelledby="collections-breakdown-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2
          id="collections-breakdown-heading"
          className="text-xs uppercase tracking-luxury text-vantaire-champagne font-semibold"
        >
          Curated Collections Inventory
        </h2>
        <span className="text-[11px] font-mono text-vantaire-muted">
          {collections.length} Total Registered
        </span>
      </div>

      <div className="border border-vantaire-border/80 bg-vantaire-charcoal/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-vantaire-sand border-collapse">
            <thead>
              <tr className="border-b border-vantaire-border/80 bg-vantaire-black/40 text-[10px] uppercase font-mono tracking-wider text-vantaire-muted">
                <th scope="col" className="py-3 px-4">
                  Collection Name
                </th>
                <th scope="col" className="py-3 px-4">
                  Slug
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  Assigned Products
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  Status
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Preview
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vantaire-border/40">
              {collections.map((col) => (
                <tr
                  key={col.id}
                  className="hover:bg-vantaire-black/30 transition-colors"
                >
                  <td className="py-3.5 px-4 font-medium text-vantaire-warmWhite whitespace-nowrap">
                    {col.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-vantaire-sand/80 whitespace-nowrap">
                    {col.slug}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-vantaire-warmWhite font-medium">
                    {col.productCount}
                  </td>
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      Active
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Link
                      href={`/collections/${col.slug}`}
                      className="inline-flex items-center gap-1 text-[11px] text-vantaire-sand hover:text-vantaire-champagne transition-colors"
                      title={`Preview ${col.name} on public storefront`}
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
