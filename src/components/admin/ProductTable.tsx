"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  ExternalLink,
  Edit,
  Archive,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  Loader2,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { buildPublicStorageUrl } from "@/lib/data/media";
import { archiveProductAction, restoreProductAction } from "@/lib/admin/product-actions";

export interface AdminProductRow {
  id: string;
  legacy_id: string;
  slug: string;
  name: string;
  short_name: string;
  category: string;
  gender: string;
  price: number;
  compare_at_price: number | null;
  currency_symbol: string;
  frame_shape: string;
  in_stock: boolean;
  is_active: boolean;
  featured: boolean;
  best_seller: boolean;
  new_arrival: boolean;
  badge: string | null;
  updated_at: string;
  primary_image_path: string | null;
  collection_names: string[];
}

interface ProductTableProps {
  products: AdminProductRow[];
}

export function ProductTable({ products }: ProductTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");
  const [shapeFilter, setShapeFilter] = useState<string>("all");

  // Modal confirmation state
  const [actionModal, setActionModal] = useState<{
    type: "archive" | "restore";
    product: AdminProductRow;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Extract unique frame shapes for filter dropdown
  const uniqueShapes = useMemo(() => {
    const shapes = new Set<string>();
    products.forEach((p) => {
      if (p.frame_shape) shapes.add(p.frame_shape);
    });
    return Array.from(shapes).sort();
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesSlug = p.slug.toLowerCase().includes(query);
        const matchesLegacy = p.legacy_id.toLowerCase().includes(query);
        const matchesShape = p.frame_shape.toLowerCase().includes(query);
        if (!matchesName && !matchesSlug && !matchesLegacy && !matchesShape) {
          return false;
        }
      }

      // Status filter
      if (statusFilter === "active" && !p.is_active) return false;
      if (statusFilter === "inactive" && p.is_active) return false;

      // Stock filter
      if (stockFilter === "in_stock" && !p.in_stock) return false;
      if (stockFilter === "out_of_stock" && p.in_stock) return false;

      // Shape filter
      if (shapeFilter !== "all" && p.frame_shape !== shapeFilter) return false;

      return true;
    });
  }, [products, search, statusFilter, stockFilter, shapeFilter]);

  const handleConfirmAction = () => {
    if (!actionModal) return;
    setActionError(null);

    startTransition(async () => {
      try {
        const token = {
          id: actionModal.product.id,
          updated_at: actionModal.product.updated_at,
        };

        const res =
          actionModal.type === "archive"
            ? await archiveProductAction(token)
            : await restoreProductAction(token);

        if (!res.success) {
          setActionError(res.message);
        } else {
          setActionModal(null);
          router.refresh();
        }
      } catch (err: any) {
        setActionError(err?.message || "An unexpected error occurred.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Search, Filters, Add Product CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-vantaire-charcoal/40 p-4 border border-vantaire-border/80">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-vantaire-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, slug, or ID..."
              aria-label="Search products"
              className="w-full pl-9 pr-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite placeholder:text-vantaire-muted focus:outline-none focus:border-vantaire-champagne transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            aria-label="Filter by publication status"
            className="py-2 px-3 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-sand focus:outline-none focus:border-vantaire-champagne transition-colors"
          >
            <option value="all">Status: All</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive / Drafts</option>
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            aria-label="Filter by inventory status"
            className="py-2 px-3 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-sand focus:outline-none focus:border-vantaire-champagne transition-colors"
          >
            <option value="all">Stock: All</option>
            <option value="in_stock">In Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>

          {/* Frame Shape Filter */}
          <select
            value={shapeFilter}
            onChange={(e) => setShapeFilter(e.target.value)}
            aria-label="Filter by frame shape"
            className="py-2 px-3 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-sand focus:outline-none focus:border-vantaire-champagne transition-colors"
          >
            <option value="all">Shape: All</option>
            {uniqueShapes.map((shape) => (
              <option key={shape} value={shape}>
                {shape}
              </option>
            ))}
          </select>

          {(search || statusFilter !== "all" || stockFilter !== "all" || shapeFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setStockFilter("all");
                setShapeFilter("all");
              }}
              className="text-xs text-vantaire-champagne hover:underline py-1 px-2"
            >
              Reset
            </button>
          )}
        </div>

        {/* Add Product CTA */}
        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-vantaire-champagne text-vantaire-black font-semibold text-xs uppercase tracking-luxury hover:bg-vantaire-champagne/90 transition-colors shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </Link>
      </div>

      {/* Results Count & Table Header */}
      <div className="flex items-center justify-between text-xs text-vantaire-muted px-1">
        <span>
          Showing <strong className="text-vantaire-warmWhite font-mono">{filteredProducts.length}</strong> of{" "}
          <strong className="text-vantaire-warmWhite font-mono">{products.length}</strong> products
        </span>
      </div>

      {/* Desktop & Tablet Table */}
      <div className="border border-vantaire-border/80 bg-vantaire-charcoal/30 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-vantaire-sand border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-vantaire-border/80 bg-vantaire-black/50 text-[10px] uppercase font-mono tracking-wider text-vantaire-muted">
                <th scope="col" className="py-3 px-4 w-16">
                  Image
                </th>
                <th scope="col" className="py-3 px-4">
                  Product Details
                </th>
                <th scope="col" className="py-3 px-4">
                  Category & Shape
                </th>
                <th scope="col" className="py-3 px-4">
                  Price (BDT)
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  Inventory
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  Status
                </th>
                <th scope="col" className="py-3 px-4 text-center">
                  Merchandising
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vantaire-border/40">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-vantaire-muted">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium text-vantaire-sand">No products match your search or filters.</p>
                    <p className="text-xs mt-1">Try broadening your criteria or reset all filters.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const imageUrl = p.primary_image_path
                    ? buildPublicStorageUrl(p.primary_image_path)
                    : null;

                  return (
                    <tr key={p.id} className="hover:bg-vantaire-black/30 transition-colors">
                      {/* Image Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="w-12 h-12 bg-vantaire-black/80 border border-vantaire-border/60 relative flex items-center justify-center overflow-hidden">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={p.name}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-[9px] font-mono text-vantaire-muted uppercase text-center px-1">
                              No Img
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Product Name, Legacy ID, and Slug */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-vantaire-warmWhite text-sm leading-snug">
                          {p.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-vantaire-black/60 border border-vantaire-border/60 text-vantaire-champagne">
                            {p.legacy_id}
                          </span>
                          <span className="text-[10px] font-mono text-vantaire-muted truncate max-w-[200px]">
                            {p.slug}
                          </span>
                        </div>
                        {p.collection_names.length > 0 && (
                          <div className="text-[10px] text-vantaire-muted/80 mt-1">
                            Collections: {p.collection_names.join(", ")}
                          </div>
                        )}
                      </td>

                      {/* Category & Shape */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-vantaire-warmWhite">{p.frame_shape}</div>
                        <div className="text-[10px] text-vantaire-muted">
                          {p.category} • {p.gender}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-vantaire-warmWhite font-medium">
                          {p.currency_symbol}
                          {p.price.toLocaleString()}
                        </div>
                        {p.compare_at_price && (
                          <div className="font-mono text-[10px] text-vantaire-muted line-through">
                            {p.currency_symbol}
                            {p.compare_at_price.toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Inventory Stock Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {p.in_stock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Out of Stock
                          </span>
                        )}
                      </td>

                      {/* Publication Status Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <XCircle className="w-2.5 h-2.5" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Merchandising Tags */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex flex-wrap items-center justify-center gap-1 max-w-[140px] mx-auto">
                          {p.featured && (
                            <span className="text-[9px] font-mono px-1 py-0.2 bg-vantaire-champagne/15 text-vantaire-champagne border border-vantaire-champagne/30">
                              Featured
                            </span>
                          )}
                          {p.best_seller && (
                            <span className="text-[9px] font-mono px-1 py-0.2 bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              Best Seller
                            </span>
                          )}
                          {p.new_arrival && (
                            <span className="text-[9px] font-mono px-1 py-0.2 bg-purple-500/15 text-purple-400 border border-purple-500/30">
                              New
                            </span>
                          )}
                          {!p.featured && !p.best_seller && !p.new_arrival && (
                            <span className="text-[10px] text-vantaire-muted font-mono">—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-vantaire-black/50 border border-vantaire-border text-vantaire-sand hover:text-vantaire-warmWhite hover:border-vantaire-champagne transition-colors"
                            title="Edit product"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </Link>

                          <Link
                            href={`/admin/products/${p.id}/media`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-vantaire-black/50 border border-vantaire-border text-vantaire-sand hover:text-vantaire-champagne hover:border-vantaire-champagne/60 transition-colors"
                            title="Manage product media"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>Media</span>
                          </Link>

                          {p.is_active ? (
                            <button
                              type="button"
                              onClick={() => setActionModal({ type: "archive", product: p })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-vantaire-black/50 border border-vantaire-border text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30 transition-colors"
                              title="Archive product (hide from storefront)"
                            >
                              <Archive className="w-3 h-3" />
                              <span>Archive</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActionModal({ type: "restore", product: p })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-vantaire-black/50 border border-vantaire-border text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors"
                              title="Restore product (activate on storefront)"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restore</span>
                            </button>
                          )}

                          {p.is_active && (
                            <Link
                              href={`/products/${p.slug}`}
                              target="_blank"
                              className="p-1 text-vantaire-muted hover:text-vantaire-champagne transition-colors"
                              title="View on live storefront"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
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

      {/* Confirmation Modal for Archive & Restore */}
      {actionModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="action-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="bg-vantaire-charcoal border border-vantaire-border w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3
              id="action-modal-title"
              className="text-sm font-serif tracking-wider uppercase font-semibold text-vantaire-warmWhite"
            >
              {actionModal.type === "archive" ? "Archive Product" : "Restore & Activate Product"}
            </h3>

            <p className="text-xs text-vantaire-sand leading-relaxed">
              {actionModal.type === "archive" ? (
                <>
                  Are you sure you want to archive <strong>&ldquo;{actionModal.product.name}&rdquo;</strong> (
                  <span className="font-mono text-vantaire-champagne">{actionModal.product.legacy_id}</span>)?
                  This will deactivate the product and immediately hide it from all public storefront queries and sitemaps.
                </>
              ) : (
                <>
                  Are you sure you want to restore and activate <strong>&ldquo;{actionModal.product.name}&rdquo;</strong> (
                  <span className="font-mono text-vantaire-champagne">{actionModal.product.legacy_id}</span>)?
                  This product will become visible on the public storefront. A primary product image is required.
                </>
              )}
            </p>

            {actionError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setActionModal(null);
                  setActionError(null);
                }}
                className="px-4 py-2 text-xs text-vantaire-sand hover:text-vantaire-warmWhite border border-vantaire-border transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmAction}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-luxury transition-colors cursor-pointer ${
                  actionModal.type === "archive"
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {actionModal.type === "archive" ? "Confirm Archive" : "Confirm Restore"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
