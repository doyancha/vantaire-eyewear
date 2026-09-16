"use client";

import { useState, useMemo, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ArrowDown,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  RotateCcw,
  Save,
  ExternalLink,
} from "lucide-react";
import { buildPublicStorageUrl } from "@/lib/data/media";
import { reorderCollectionsAction } from "@/lib/admin/merchandising-actions";
import { AdminCollectionOrderingRow } from "./types";

interface CollectionOrderingListProps {
  initialCollections: AdminCollectionOrderingRow[];
}

export function CollectionOrderingList({
  initialCollections,
}: CollectionOrderingListProps) {
  const router = useRouter();

  // Working state for collection list and order
  const [collectionList, setCollectionList] = useState<AdminCollectionOrderingRow[]>(initialCollections);
  const [originalOrder, setOriginalOrder] = useState<string[]>(
    initialCollections.map((c) => c.id)
  );

  // Feedback states
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isReorderPending, startReorderTransition] = useTransition();

  // Check if current order differs from baseline
  const isOrderDirty = useMemo(() => {
    if (collectionList.length !== originalOrder.length) return false;
    return collectionList.some((c, idx) => c.id !== originalOrder[idx]);
  }, [collectionList, originalOrder]);

  // Move up/down handler
  const handleMove = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index <= 0) return;
    if (direction === "down" && index >= collectionList.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const nextList = [...collectionList];
    const item = nextList[index];
    nextList[index] = nextList[targetIndex];
    nextList[targetIndex] = item;

    // Recalculate sort_order indices for visualization
    const normalized = nextList.map((c, idx) => ({ ...c, sort_order: idx }));
    setCollectionList(normalized);
  };

  const handleResetOrder = () => {
    const map = new Map(collectionList.map((c) => [c.id, c]));
    const restored = originalOrder
      .map((id, idx) => {
        const item = map.get(id);
        return item ? { ...item, sort_order: idx } : null;
      })
      .filter((c): c is AdminCollectionOrderingRow => c !== null);

    setCollectionList(restored);
  };

  const handleSaveOrder = () => {
    setActionError(null);
    setActionSuccess(null);

    startReorderTransition(async () => {
      const desiredIds = collectionList.map((c) => c.id);
      const res = await reorderCollectionsAction({
        desiredIds,
        expectedIds: originalOrder,
      });

      if (!res.success) {
        setActionError(res.message);
      } else {
        setActionSuccess(res.message);
        setOriginalOrder(desiredIds);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Alert Notices */}
      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{actionError}</div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-rose-200 text-xs font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="flex items-center gap-3 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="flex-1">{actionSuccess}</span>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Unsaved Order Changes Banner */}
      {isOrderDirty && (
        <div className="p-4 bg-vantaire-champagne/10 border border-vantaire-champagne/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-vantaire-champagne font-mono">
            <Layers className="w-4 h-4 shrink-0" />
            <span>
              Collection global sequence has been modified. Save to apply changes across /collections and homepage Shop By Silhouette.
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleResetOrder}
              disabled={isReorderPending}
              className="px-3 py-1.5 border border-vantaire-border/40 text-xs text-vantaire-muted hover:text-vantaire-warmWhite transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSaveOrder}
              disabled={isReorderPending}
              className="px-4 py-1.5 bg-vantaire-champagne text-vantaire-black text-xs font-semibold uppercase tracking-luxury hover:bg-vantaire-champagne/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isReorderPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save New Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Collection Cards List */}
      <div className="space-y-3">
        {collectionList.map((col, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === collectionList.length - 1;

          return (
            <div
              key={col.id}
              className="bg-vantaire-card border border-vantaire-border/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-vantaire-champagne/30 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* Position Indicator & Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-base font-semibold text-vantaire-champagne w-6 text-center">
                    {col.sort_order}
                  </span>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      aria-label={`Move ${col.name} collection up`}
                      disabled={isFirst || isReorderPending}
                      onClick={() => handleMove(idx, "up")}
                      className="p-1.5 bg-vantaire-charcoal/40 hover:bg-vantaire-champagne/20 text-vantaire-muted hover:text-vantaire-champagne disabled:opacity-20 disabled:hover:bg-vantaire-charcoal/40 disabled:hover:text-vantaire-muted transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${col.name} collection down`}
                      disabled={isLast || isReorderPending}
                      onClick={() => handleMove(idx, "down")}
                      className="p-1.5 bg-vantaire-charcoal/40 hover:bg-vantaire-champagne/20 text-vantaire-muted hover:text-vantaire-champagne disabled:opacity-20 disabled:hover:bg-vantaire-charcoal/40 disabled:hover:text-vantaire-muted transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Cover Thumbnail */}
                <div className="relative w-16 h-12 bg-vantaire-charcoal/40 border border-vantaire-border/40 shrink-0 overflow-hidden">
                  {col.cover_image ? (
                    <Image
                      src={buildPublicStorageUrl(col.cover_image)}
                      alt={col.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-vantaire-muted">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Collection Meta */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/collections/${col.id}/edit`}
                      className="font-medium text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors truncate"
                    >
                      {col.name}
                    </Link>
                    <span
                      className={`px-1.5 py-0.2 text-[9px] font-mono uppercase tracking-wider ${
                        col.is_active
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {col.is_active ? "Active" : "Archived"}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-vantaire-muted">
                    /{col.slug} · {col.product_count} products
                  </div>
                </div>
              </div>

              {/* Edit Link */}
              <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                <Link
                  href={`/admin/collections/${col.id}/edit`}
                  className="text-xs font-mono text-vantaire-muted hover:text-vantaire-champagne transition-colors flex items-center gap-1"
                >
                  <span>Edit Collection</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
