"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  ExternalLink,
  Edit,
  Archive,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Layers,
  Image as ImageIcon,
} from "lucide-react";
import { buildPublicStorageUrl } from "@/lib/data/media";
import {
  archiveCollectionAction,
  restoreCollectionAction,
} from "@/lib/admin/collection-actions";

export interface AdminCollectionRow {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  cover_image: string | null;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
  product_count: number;
  active_product_count: number;
}

interface CollectionTableProps {
  collections: AdminCollectionRow[];
}

export function CollectionTable({ collections }: CollectionTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredCollections = useMemo(() => {
    return collections.filter((col) => {
      // Status filter
      if (statusFilter === "active" && !col.is_active) return false;
      if (statusFilter === "inactive" && col.is_active) return false;

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = col.name.toLowerCase().includes(q);
        const matchSlug = col.slug.toLowerCase().includes(q);
        const matchTagline = col.tagline.toLowerCase().includes(q);
        if (!matchName && !matchSlug && !matchTagline) return false;
      }

      return true;
    });
  }, [collections, statusFilter, search]);

  const activeCount = useMemo(() => collections.filter((c) => c.is_active).length, [collections]);
  const inactiveCount = useMemo(() => collections.filter((c) => !c.is_active).length, [collections]);

  const handleArchive = (collection: AdminCollectionRow) => {
    if (!confirm(`Are you sure you want to archive '${collection.name}'? It will be hidden from the public storefront.`)) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setPendingId(collection.id);

    startTransition(async () => {
      const res = await archiveCollectionAction({
        id: collection.id,
        updated_at: collection.updated_at,
      });

      setPendingId(null);
      if (res.success) {
        setActionSuccess(res.message);
        router.refresh();
      } else {
        setActionError(res.message);
      }
    });
  };

  const handleRestore = (collection: AdminCollectionRow) => {
    setActionError(null);
    setActionSuccess(null);
    setPendingId(collection.id);

    startTransition(async () => {
      const res = await restoreCollectionAction({
        id: collection.id,
        updated_at: collection.updated_at,
      });

      setPendingId(null);
      if (res.success) {
        setActionSuccess(res.message);
        router.refresh();
      } else {
        setActionError(res.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-800/80 text-red-200 text-xs rounded animate-fadeIn"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">{actionError}</div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-400 hover:text-red-200 font-bold"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="flex items-start gap-3 p-4 bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 text-xs rounded animate-fadeIn"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">{actionSuccess}</div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-emerald-400 hover:text-emerald-200 font-bold"
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* Control Bar: Search, Filters, and New Collection CTA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-vantaire-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, slug, or tagline..."
            aria-label="Search collections"
            className="w-full pl-10 pr-4 py-2 bg-vantaire-charcoal/40 border border-vantaire-border/80 text-xs text-vantaire-warmWhite placeholder:text-vantaire-muted focus:outline-none focus:border-vantaire-champagne/80 transition-colors"
          />
        </div>

        {/* Filter Pills & Add Button */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
          <div className="flex items-center border border-vantaire-border/80 bg-vantaire-charcoal/30 text-xs p-0.5">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 transition-colors ${
                statusFilter === "all"
                  ? "bg-vantaire-champagne/20 text-vantaire-champagne font-medium"
                  : "text-vantaire-sand/70 hover:text-vantaire-warmWhite"
              }`}
            >
              All ({collections.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 transition-colors ${
                statusFilter === "active"
                  ? "bg-emerald-950/60 text-emerald-300 font-medium"
                  : "text-vantaire-sand/70 hover:text-vantaire-warmWhite"
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1.5 transition-colors ${
                statusFilter === "inactive"
                  ? "bg-amber-950/60 text-amber-300 font-medium"
                  : "text-vantaire-sand/70 hover:text-vantaire-warmWhite"
              }`}
            >
              Archived ({inactiveCount})
            </button>
          </div>

          <Link
            href="/admin/collections/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-vantaire-champagne text-vantaire-black hover:bg-vantaire-champagne/90 text-xs font-semibold tracking-luxury uppercase transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Collection</span>
          </Link>
        </div>
      </div>

      {/* Desktop & Tablet Table */}
      <div className="border border-vantaire-border/80 bg-vantaire-charcoal/30 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-vantaire-sand border-collapse">
            <thead>
              <tr className="border-b border-vantaire-border/80 bg-vantaire-black/50 text-[10px] uppercase font-mono tracking-wider text-vantaire-muted">
                <th scope="col" className="py-3 px-4 w-16">
                  Cover
                </th>
                <th scope="col" className="py-3 px-4">
                  Collection
                </th>
                <th scope="col" className="py-3 px-4">
                  Slug
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  Status
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  Products
                </th>
                <th scope="col" className="py-3 px-4">
                  Updated
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vantaire-border/40">
              {filteredCollections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-vantaire-muted">
                    No collections match your criteria.
                  </td>
                </tr>
              ) : (
                filteredCollections.map((col) => {
                  const coverUrl = col.cover_image
                    ? buildPublicStorageUrl(col.cover_image)
                    : null;
                  const isOperating = isPending && pendingId === col.id;

                  return (
                    <tr
                      key={col.id}
                      className="hover:bg-vantaire-black/30 transition-colors"
                    >
                      {/* Cover Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="w-12 h-8 bg-vantaire-black border border-vantaire-border/60 relative flex items-center justify-center overflow-hidden">
                          {coverUrl ? (
                            <Image
                              src={coverUrl}
                              alt={`${col.name} cover`}
                              fill
                              sizes="48px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-vantaire-muted/60" />
                          )}
                        </div>
                      </td>

                      {/* Name & Tagline */}
                      <td className="py-3.5 px-4 font-medium text-vantaire-warmWhite">
                        <div className="font-medium text-sm text-vantaire-warmWhite">
                          {col.name}
                        </div>
                        <div className="text-[11px] text-vantaire-muted line-clamp-1">
                          {col.tagline}
                        </div>
                      </td>

                      {/* Slug */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-vantaire-sand/80">
                        {col.slug}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {col.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase bg-amber-950/60 text-amber-300 border border-amber-800/60">
                            Archived
                          </span>
                        )}
                      </td>

                      {/* Products count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-xs text-vantaire-warmWhite">
                          {col.product_count}
                        </span>
                        <span className="text-[10px] text-vantaire-muted ml-1">
                          ({col.active_product_count} active)
                        </span>
                      </td>

                      {/* Updated Date */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-vantaire-muted">
                        {new Date(col.updated_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/collections/${col.id}/edit`}
                            className="p-1.5 text-vantaire-sand/80 hover:text-vantaire-warmWhite hover:bg-vantaire-charcoal/60 transition-colors"
                            title="Edit Collection"
                            aria-label={`Edit ${col.name}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>

                          {col.is_active && (
                            <Link
                              href={`/collections/${col.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-vantaire-sand/80 hover:text-vantaire-champagne hover:bg-vantaire-charcoal/60 transition-colors"
                              title="View Storefront Collection"
                              aria-label={`View ${col.name} on storefront`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}

                          {col.is_active ? (
                            <button
                              type="button"
                              onClick={() => handleArchive(col)}
                              disabled={isOperating}
                              className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 transition-colors disabled:opacity-50"
                              title="Archive Collection"
                              aria-label={`Archive ${col.name}`}
                            >
                              {isOperating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Archive className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRestore(col)}
                              disabled={isOperating}
                              className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 transition-colors disabled:opacity-50"
                              title="Restore Collection"
                              aria-label={`Restore ${col.name}`}
                            >
                              {isOperating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="space-y-3 md:hidden">
        {filteredCollections.length === 0 ? (
          <div className="p-8 text-center text-xs text-vantaire-muted border border-vantaire-border/80 bg-vantaire-charcoal/30">
            No collections match your criteria.
          </div>
        ) : (
          filteredCollections.map((col) => {
            const coverUrl = col.cover_image
              ? buildPublicStorageUrl(col.cover_image)
              : null;
            const isOperating = isPending && pendingId === col.id;

            return (
              <div
                key={col.id}
                className="p-4 border border-vantaire-border/80 bg-vantaire-charcoal/40 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-10 bg-vantaire-black border border-vantaire-border/60 relative flex items-center justify-center overflow-hidden shrink-0">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={`${col.name} cover`}
                        fill
                        sizes="56px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-vantaire-muted/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium text-sm text-vantaire-warmWhite truncate">
                        {col.name}
                      </h3>
                      {col.is_active ? (
                        <span className="inline-flex px-1.5 py-0.5 text-[9px] font-mono uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex px-1.5 py-0.5 text-[9px] font-mono uppercase bg-amber-950/60 text-amber-300 border border-amber-800/60">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-vantaire-sand/70 truncate">
                      {col.slug}
                    </p>
                    <p className="text-[11px] text-vantaire-muted line-clamp-1 mt-0.5">
                      {col.tagline}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-vantaire-border/40 font-mono text-[11px] text-vantaire-muted">
                  <span>
                    {col.product_count} products ({col.active_product_count} active)
                  </span>
                  <span>
                    {new Date(col.updated_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Link
                    href={`/admin/collections/${col.id}/edit`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-vantaire-charcoal/80 text-vantaire-warmWhite border border-vantaire-border/80 hover:border-vantaire-champagne/80"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Link>

                  {col.is_active && (
                    <Link
                      href={`/collections/${col.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-vantaire-sand/80 hover:text-vantaire-champagne border border-vantaire-border/80"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {col.is_active ? (
                    <button
                      type="button"
                      onClick={() => handleArchive(col)}
                      disabled={isOperating}
                      className="p-1.5 text-amber-400 border border-amber-800/60 hover:bg-amber-950/40 disabled:opacity-50"
                    >
                      {isOperating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Archive className="w-3.5 h-3.5" />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRestore(col)}
                      disabled={isOperating}
                      className="p-1.5 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-950/40 disabled:opacity-50"
                    >
                      {isOperating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
