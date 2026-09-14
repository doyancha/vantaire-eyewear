"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Image as ImageIcon, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { buildPublicStorageUrl } from "@/lib/data/media";

export interface MediaOverviewProductItem {
  id: string;
  name: string;
  slug: string;
  legacyId: string;
  isActive: boolean;
  imageCount: number;
  primaryImage: {
    storagePath: string;
    altText: string;
  } | null;
}

interface MediaOverviewTableProps {
  products: MediaOverviewProductItem[];
}

export function MediaOverviewTable({ products }: MediaOverviewTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "archived">("all");
  const [filterCapacity, setFilterCapacity] = useState<"all" | "missing" | "partial" | "full">("all");

  const filtered = useMemo(() => {
    return products.filter((p) => {
      // Search
      const term = searchTerm.toLowerCase().trim();
      if (
        term &&
        !p.name.toLowerCase().includes(term) &&
        !p.slug.toLowerCase().includes(term) &&
        !p.legacyId.toLowerCase().includes(term)
      ) {
        return false;
      }

      // Status
      if (filterStatus === "active" && !p.isActive) return false;
      if (filterStatus === "archived" && p.isActive) return false;

      // Capacity
      if (filterCapacity === "missing" && p.imageCount > 0) return false;
      if (filterCapacity === "partial" && (p.imageCount === 0 || p.imageCount === 5)) return false;
      if (filterCapacity === "full" && p.imageCount < 5) return false;

      return true;
    });
  }, [products, searchTerm, filterStatus, filterCapacity]);

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-vantaire-charcoal/30 border border-vantaire-border/80">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-vantaire-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product name, slug, or legacy ID..."
            className="w-full pl-9 pr-3 py-2 bg-vantaire-black border border-vantaire-border text-xs text-vantaire-warmWhite placeholder:text-vantaire-muted/60 focus:border-vantaire-champagne focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 bg-vantaire-black border border-vantaire-border text-xs text-vantaire-sand font-mono focus:border-vantaire-champagne focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Storefront</option>
            <option value="archived">Archived / Draft</option>
          </select>

          {/* Capacity Filter */}
          <select
            value={filterCapacity}
            onChange={(e) => setFilterCapacity(e.target.value as any)}
            className="px-3 py-2 bg-vantaire-black border border-vantaire-border text-xs text-vantaire-sand font-mono focus:border-vantaire-champagne focus:outline-none"
          >
            <option value="all">All Capacities</option>
            <option value="missing">Missing Images (0/5)</option>
            <option value="partial">Partial Gallery (1-4/5)</option>
            <option value="full">Full Gallery (5/5)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-vantaire-border bg-vantaire-charcoal/20">
        <table className="w-full text-left text-xs">
          <thead className="bg-vantaire-charcoal/60 text-vantaire-muted uppercase font-mono text-[10px] tracking-wider border-b border-vantaire-border">
            <tr>
              <th className="p-3 w-16">Preview</th>
              <th className="p-3">Product Name</th>
              <th className="p-3">Legacy ID</th>
              <th className="p-3">Status</th>
              <th className="p-3">Gallery</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vantaire-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-vantaire-muted font-mono text-xs">
                  No products match the selected criteria.
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const primaryUrl = item.primaryImage
                  ? buildPublicStorageUrl(item.primaryImage.storagePath)
                  : null;

                return (
                  <tr key={item.id} className="hover:bg-vantaire-charcoal/40 transition">
                    {/* Thumbnail */}
                    <td className="p-3">
                      <div className="w-12 h-12 bg-vantaire-black border border-vantaire-border relative overflow-hidden flex items-center justify-center">
                        {primaryUrl ? (
                          <Image
                            src={primaryUrl}
                            alt={item.primaryImage?.altText || item.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-vantaire-muted" />
                        )}
                      </div>
                    </td>

                    {/* Product Name & Slug */}
                    <td className="p-3">
                      <div className="font-medium text-vantaire-warmWhite">
                        <Link
                          href={`/admin/products/${item.id}/media`}
                          className="hover:text-vantaire-champagne transition"
                        >
                          {item.name}
                        </Link>
                      </div>
                      <div className="font-mono text-[10px] text-vantaire-muted truncate max-w-xs">
                        {item.slug}
                      </div>
                    </td>

                    {/* Legacy ID */}
                    <td className="p-3 font-mono text-vantaire-sand text-[11px]">
                      {item.legacyId}
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-2.5 h-2.5" />
                          Archived
                        </span>
                      )}
                    </td>

                    {/* Capacity Badge */}
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono border ${
                          item.imageCount === 0
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : item.imageCount === 5
                            ? "bg-vantaire-champagne/15 text-vantaire-champagne border-vantaire-champagne/30"
                            : "bg-vantaire-charcoal text-vantaire-sand border-vantaire-border"
                        }`}
                      >
                        {item.imageCount} / 5 Images
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/products/${item.id}/media`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-vantaire-charcoal hover:bg-vantaire-charcoal/80 text-vantaire-champagne border border-vantaire-border hover:border-vantaire-champagne/60 text-xs font-mono transition"
                      >
                        <span>Manage Media</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
