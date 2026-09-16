"use client";

import { useState, useMemo, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Flame,
  Glasses,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  RotateCcw,
  Save,
  Info,
} from "lucide-react";
import { buildPublicStorageUrl } from "@/lib/data/media";
import {
  updateProductMerchandisingAction,
  reorderProductsAction,
} from "@/lib/admin/merchandising-actions";
import { AdminProductMerchandisingRow } from "./types";

interface ProductMerchandisingTableProps {
  initialProducts: AdminProductMerchandisingRow[];
}

export function ProductMerchandisingTable({
  initialProducts,
}: ProductMerchandisingTableProps) {
  const router = useRouter();

  // Working state for product list and order
  const [productList, setProductList] = useState<AdminProductMerchandisingRow[]>(initialProducts);
  const [originalOrder, setOriginalOrder] = useState<string[]>(
    initialProducts.map((p) => p.id)
  );

  // Search & filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Track pending edits for flags: record of productId -> { featured, bestSeller, newArrival }
  const [flagEdits, setFlagEdits] = useState<
    Record<string, { featured: boolean; bestSeller: boolean; newArrival: boolean }>
  >({});

  // Feedback states
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [isReorderPending, startReorderTransition] = useTransition();

  // Check if current order differs from baseline
  const isOrderDirty = useMemo(() => {
    if (productList.length !== originalOrder.length) return false;
    return productList.some((p, idx) => p.id !== originalOrder[idx]);
  }, [productList, originalOrder]);

  // Filtered view
  const filteredProducts = useMemo(() => {
    return productList.filter((p) => {
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "inactive" && p.is_active) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSlug = p.slug.toLowerCase().includes(q);
        const matchesLegacy = p.legacy_id.toLowerCase().includes(q);
        if (!matchesName && !matchesSlug && !matchesLegacy) return false;
      }

      return true;
    });
  }, [productList, statusFilter, search]);

  const isFilterActive = search.trim().length > 0 || statusFilter !== "all";

  // Reordering handlers (operates on the master productList)
  const handleMove = (indexInMaster: number, direction: "up" | "down") => {
    if (direction === "up" && indexInMaster <= 0) return;
    if (direction === "down" && indexInMaster >= productList.length - 1) return;

    const targetIndex = direction === "up" ? indexInMaster - 1 : indexInMaster + 1;
    const nextList = [...productList];
    const item = nextList[indexInMaster];
    nextList[indexInMaster] = nextList[targetIndex];
    nextList[targetIndex] = item;

    // Recalculate sort_order indices for visualization
    const normalized = nextList.map((p, idx) => ({ ...p, sort_order: idx }));
    setProductList(normalized);
  };

  const handleResetOrder = () => {
    // Restore list ordered by originalOrder
    const map = new Map(productList.map((p) => [p.id, p]));
    const restored = originalOrder
      .map((id, idx) => {
        const item = map.get(id);
        return item ? { ...item, sort_order: idx } : null;
      })
      .filter((p): p is AdminProductMerchandisingRow => p !== null);

    setProductList(restored);
  };

  const handleSaveOrder = () => {
    setActionError(null);
    setActionSuccess(null);

    startReorderTransition(async () => {
      const desiredIds = productList.map((p) => p.id);
      const res = await reorderProductsAction({
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

  // Flag toggling
  const handleToggleFlag = (
    productId: string,
    flag: "featured" | "bestSeller" | "newArrival",
    currentValue: boolean
  ) => {
    const existing = flagEdits[productId];
    const prod = productList.find((p) => p.id === productId);
    if (!prod || !prod.is_active) return; // Inactive cannot be toggled

    const baseFeatured = existing ? existing.featured : prod.featured;
    const baseBestSeller = existing ? existing.bestSeller : prod.best_seller;
    const baseNewArrival = existing ? existing.newArrival : prod.new_arrival;

    const nextState = {
      featured: flag === "featured" ? !currentValue : baseFeatured,
      bestSeller: flag === "bestSeller" ? !currentValue : baseBestSeller,
      newArrival: flag === "newArrival" ? !currentValue : baseNewArrival,
    };

    setFlagEdits((prev) => ({
      ...prev,
      [productId]: nextState,
    }));
  };

  // Save Flags for a single product
  const handleSaveFlags = async (product: AdminProductMerchandisingRow) => {
    const edits = flagEdits[product.id];
    if (!edits) return;

    setActionError(null);
    setActionSuccess(null);
    setSavingProductId(product.id);

    try {
      const res = await updateProductMerchandisingAction({
        productId: product.id,
        expectedUpdatedAt: product.updated_at,
        featured: edits.featured,
        bestSeller: edits.bestSeller,
        newArrival: edits.newArrival,
      });

      if (!res.success) {
        setActionError(res.message);
      } else if (res.data) {
        const updatedData = res.data;
        setActionSuccess(res.message);
        // Update product in local state with new flags and new updated_at
        setProductList((prev) =>
          prev.map((p) =>
            p.id === product.id
              ? {
                  ...p,
                  featured: updatedData.featured,
                  best_seller: updatedData.best_seller,
                  new_arrival: updatedData.new_arrival,
                  updated_at: updatedData.updated_at,
                }
              : p
          )
        );
        // Clear pending edit for this product
        setFlagEdits((prev) => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });
        router.refresh();
      }
    } catch (err: any) {
      setActionError(err?.message || "Failed to update merchandising flags.");
    } finally {
      setSavingProductId(null);
    }
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
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              Catalog global sort order has been modified. Save to apply changes across /shop and homepage.
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vantaire-muted" />
          <input
            type="text"
            placeholder="Filter by name, legacy ID (vnt-xx), or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-vantaire-card border border-vantaire-border/40 pl-9 pr-4 py-2 text-xs text-vantaire-warmWhite placeholder:text-vantaire-muted focus:outline-none focus:border-vantaire-champagne/50"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center border border-vantaire-border/40 bg-vantaire-card p-0.5 text-xs font-mono">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 transition-colors ${
                statusFilter === "all"
                  ? "bg-vantaire-champagne/20 text-vantaire-champagne font-medium"
                  : "text-vantaire-muted hover:text-vantaire-warmWhite"
              }`}
            >
              All ({productList.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1 transition-colors ${
                statusFilter === "active"
                  ? "bg-emerald-500/20 text-emerald-400 font-medium"
                  : "text-vantaire-muted hover:text-vantaire-warmWhite"
              }`}
            >
              Active ({productList.filter((p) => p.is_active).length})
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`px-3 py-1 transition-colors ${
                statusFilter === "inactive"
                  ? "bg-rose-500/20 text-rose-400 font-medium"
                  : "text-vantaire-muted hover:text-vantaire-warmWhite"
              }`}
            >
              Inactive ({productList.filter((p) => !p.is_active).length})
            </button>
          </div>
        </div>
      </div>

      {/* Info Notice when search is active */}
      {isFilterActive && (
        <div className="flex items-center gap-2 text-[11px] font-mono text-vantaire-muted bg-vantaire-card/40 p-2.5 border border-vantaire-border/30">
          <Info className="w-3.5 h-3.5 text-vantaire-champagne shrink-0" />
          <span>
            Global reordering controls are disabled while a filter or search query is active. Clear search/filter to reorder full catalog.
          </span>
        </div>
      )}

      {/* Product Table (Desktop and Tablet) */}
      <div className="border border-vantaire-border/40 bg-vantaire-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-vantaire-charcoal/40 text-vantaire-muted font-mono uppercase tracking-luxury text-[10px] border-b border-vantaire-border/40">
              <tr>
                <th className="py-3 px-3 w-16 text-center">Order</th>
                <th className="py-3 px-3">Product</th>
                <th className="py-3 px-3 w-28 text-center">Status</th>
                <th className="py-3 px-3 w-28">Badge</th>
                <th className="py-3 px-3 w-28 text-center">Featured</th>
                <th className="py-3 px-3 w-28 text-center">Best Seller</th>
                <th className="py-3 px-3 w-28 text-center">New Arrival</th>
                <th className="py-3 px-3 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vantaire-border/30">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-vantaire-muted font-mono">
                    No products matched your filter.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const masterIndex = productList.findIndex((p) => p.id === product.id);
                  const isFirst = masterIndex === 0;
                  const isLast = masterIndex === productList.length - 1;

                  const edit = flagEdits[product.id];
                  const currentFeatured = edit ? edit.featured : product.featured;
                  const currentBestSeller = edit ? edit.bestSeller : product.best_seller;
                  const currentNewArrival = edit ? edit.newArrival : product.new_arrival;

                  const isRowDirty =
                    edit &&
                    (edit.featured !== product.featured ||
                      edit.bestSeller !== product.best_seller ||
                      edit.newArrival !== product.new_arrival);

                  const isSavingThis = savingProductId === product.id;

                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-vantaire-charcoal/20 transition-colors ${
                        !product.is_active ? "opacity-60 bg-vantaire-black/20" : ""
                      }`}
                    >
                      {/* Sort Controls */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs text-vantaire-muted w-6 text-right">
                            {product.sort_order}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              aria-label={`Move ${product.name} up`}
                              disabled={isFirst || isFilterActive || isReorderPending}
                              onClick={() => handleMove(masterIndex, "up")}
                              className="p-1 hover:bg-vantaire-champagne/20 text-vantaire-muted hover:text-vantaire-champagne disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-vantaire-muted transition-colors"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Move ${product.name} down`}
                              disabled={isLast || isFilterActive || isReorderPending}
                              onClick={() => handleMove(masterIndex, "down")}
                              className="p-1 hover:bg-vantaire-champagne/20 text-vantaire-muted hover:text-vantaire-champagne disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-vantaire-muted transition-colors"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Product Thumbnail & Identity */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 bg-vantaire-charcoal/40 border border-vantaire-border/40 shrink-0 overflow-hidden">
                            {product.primary_image ? (
                              <Image
                                src={buildPublicStorageUrl(product.primary_image)}
                                alt={product.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-vantaire-muted">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-mono text-[10px] text-vantaire-muted">
                              {product.legacy_id}
                            </div>
                            <Link
                              href={`/admin/products/${product.id}/edit`}
                              className="font-medium text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors truncate block"
                            >
                              {product.name}
                            </Link>
                          </div>
                        </div>
                      </td>

                      {/* Active & Stock Status */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
                              product.is_active
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {product.is_active ? "Active" : "Archived"}
                          </span>
                          <span className="text-[10px] text-vantaire-muted font-mono">
                            {product.in_stock ? "In Stock" : "Out of Stock"}
                          </span>
                        </div>
                      </td>

                      {/* Marketing Badge (Read-Only) */}
                      <td className="py-3 px-3 font-mono text-[11px] text-vantaire-muted">
                        {product.badge ? (
                          <span className="text-vantaire-champagne truncate block max-w-[120px]">
                            {product.badge}
                          </span>
                        ) : (
                          <span className="text-vantaire-muted/40">—</span>
                        )}
                      </td>

                      {/* Featured Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentFeatured}
                            disabled={!product.is_active || isSavingThis}
                            onChange={() =>
                              handleToggleFlag(product.id, "featured", currentFeatured)
                            }
                            className="w-4 h-4 rounded border-vantaire-border/40 bg-vantaire-black text-vantaire-champagne focus:ring-vantaire-champagne focus:ring-offset-0 disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </label>
                      </td>

                      {/* Best Seller Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentBestSeller}
                            disabled={!product.is_active || isSavingThis}
                            onChange={() =>
                              handleToggleFlag(product.id, "bestSeller", currentBestSeller)
                            }
                            className="w-4 h-4 rounded border-vantaire-border/40 bg-vantaire-black text-amber-400 focus:ring-amber-400 focus:ring-offset-0 disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </label>
                      </td>

                      {/* New Arrival Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={currentNewArrival}
                            disabled={!product.is_active || isSavingThis}
                            onChange={() =>
                              handleToggleFlag(product.id, "newArrival", currentNewArrival)
                            }
                            className="w-4 h-4 rounded border-vantaire-border/40 bg-vantaire-black text-sky-400 focus:ring-sky-400 focus:ring-offset-0 disabled:opacity-30 disabled:cursor-not-allowed"
                          />
                        </label>
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 px-3 text-right">
                        {isRowDirty ? (
                          <button
                            type="button"
                            disabled={isSavingThis}
                            onClick={() => handleSaveFlags(product)}
                            className="px-2.5 py-1 bg-vantaire-champagne text-vantaire-black font-semibold text-[10px] uppercase tracking-luxury hover:bg-vantaire-champagne/90 transition-colors inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            {isSavingThis ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                            <span>Save</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-vantaire-muted/40">
                            Synced
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
