"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Lock,
  ArrowLeft,
  Save,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Archive,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import {
  generateSlug,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/admin/product-validation";
import {
  createProductAction,
  updateProductAction,
  archiveProductAction,
  restoreProductAction,
} from "@/lib/admin/product-actions";
import { buildPublicStorageUrl } from "@/lib/data/media";

interface ProductFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    legacy_id: string;
    slug: string;
    name: string;
    short_name: string;
    category: string;
    gender: "Unisex" | "Men" | "Women";
    price: number;
    compare_at_price: number | null;
    currency: string;
    currency_symbol: string;
    description: string;
    short_description: string;
    frame_shape: string;
    frame_look: string;
    frame_color: string;
    lens_color: string;
    lens_type: string;
    style_category: string;
    fit: "Universal" | "Medium" | "Narrow" | "Wide";
    features: string[];
    badge: string | null;
    in_stock: boolean;
    is_active: boolean;
    featured: boolean;
    best_seller: boolean;
    new_arrival: boolean;
    seo_title: string;
    seo_description: string;
    updated_at: string;
    primary_image_path?: string | null;
    collection_names?: string[];
  };
}

const FRAME_SHAPES = [
  "Aviator",
  "Square",
  "Round",
  "Cat-Eye",
  "Geometric",
  "Sport",
  "Rectangle",
  "Oval",
  "Browline",
];

const LENS_TYPES = [
  "Polarized-Style Tint",
  "Gradient Tint",
  "Mirrored Finish",
  "Classic Solid Tint",
  "Sun-Tint",
];

export function ProductForm({ mode, initialData }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form Fields
  const [name, setName] = useState(initialData?.name || "");
  const [shortName, setShortName] = useState(initialData?.short_name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [category, setCategory] = useState(initialData?.category || "Sunglasses");
  const [gender, setGender] = useState<"Unisex" | "Men" | "Women">(
    initialData?.gender || "Unisex"
  );
  const [price, setPrice] = useState<number | string>(initialData?.price ?? 3500);
  const [compareAtPrice, setCompareAtPrice] = useState<number | string>(
    initialData?.compare_at_price ?? ""
  );
  const [description, setDescription] = useState(initialData?.description || "");
  const [shortDescription, setShortDescription] = useState(
    initialData?.short_description || ""
  );
  const [frameShape, setFrameShape] = useState(initialData?.frame_shape || "Square");
  const [frameLook, setFrameLook] = useState(initialData?.frame_look || "");
  const [frameColor, setFrameColor] = useState(initialData?.frame_color || "");
  const [lensColor, setLensColor] = useState(initialData?.lens_color || "");
  const [lensType, setLensType] = useState(
    initialData?.lens_type || "Polarized-Style Tint"
  );
  const [styleCategory, setStyleCategory] = useState(
    initialData?.style_category || "Contemporary"
  );
  const [fit, setFit] = useState<"Universal" | "Medium" | "Narrow" | "Wide">(
    initialData?.fit || "Universal"
  );
  const [featuresText, setFeaturesText] = useState(
    initialData?.features ? initialData.features.join("\n") : ""
  );
  const [badge, setBadge] = useState(initialData?.badge || "");
  const [inStock, setInStock] = useState(initialData?.in_stock ?? true);
  const [seoTitle, setSeoTitle] = useState(initialData?.seo_title || "");
  const [seoDescription, setSeoDescription] = useState(
    initialData?.seo_description || ""
  );

  // Status & Feedback
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Archive / Restore Modal state for edit mode
  const [actionModal, setActionModal] = useState<"archive" | "restore" | null>(null);

  // Auto-generate slug from name
  const handleAutoSlug = () => {
    if (name.trim()) {
      setSlug(generateSlug(name));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGlobalError(null);
    setConflictError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        if (mode === "create") {
          const payload: CreateProductInput = {
            name,
            short_name: shortName,
            slug,
            category,
            gender,
            price: Number(price),
            compare_at_price:
              compareAtPrice !== "" && compareAtPrice !== null
                ? Number(compareAtPrice)
                : null,
            description,
            short_description: shortDescription,
            frame_shape: frameShape,
            frame_look: frameLook,
            frame_color: frameColor,
            lens_color: lensColor,
            lens_type: lensType,
            style_category: styleCategory,
            fit,
            features: featuresText,
            badge: badge.trim() || null,
            seo_title: seoTitle,
            seo_description: seoDescription,
          };

          const res = await createProductAction(payload);

          if (!res.success) {
            if (res.errors) setFieldErrors(res.errors);
            setGlobalError(res.message);
          } else {
            setSuccessMessage(res.message);
            // Navigate to products list or edit view
            router.push(`/admin/products/${res.data?.id}/edit`);
          }
        } else {
          if (!initialData) return;

          const payload: UpdateProductInput = {
            id: initialData.id,
            updated_at: initialData.updated_at,
            name,
            short_name: shortName,
            category,
            gender,
            price: Number(price),
            compare_at_price:
              compareAtPrice !== "" && compareAtPrice !== null
                ? Number(compareAtPrice)
                : null,
            description,
            short_description: shortDescription,
            frame_shape: frameShape,
            frame_look: frameLook,
            frame_color: frameColor,
            lens_color: lensColor,
            lens_type: lensType,
            style_category: styleCategory,
            fit,
            features: featuresText,
            badge: badge.trim() || null,
            in_stock: inStock,
            seo_title: seoTitle,
            seo_description: seoDescription,
          };

          const res = await updateProductAction(payload);

          if (!res.success) {
            if (res.conflict) {
              setConflictError(res.message);
            } else {
              if (res.errors) setFieldErrors(res.errors);
              setGlobalError(res.message);
            }
          } else {
            setSuccessMessage(res.message);
            router.refresh();
          }
        }
      } catch (err: any) {
        setGlobalError(err?.message || "An unexpected error occurred.");
      }
    });
  };

  const handleArchiveRestore = (type: "archive" | "restore") => {
    if (!initialData) return;
    setGlobalError(null);
    setConflictError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const token = {
          id: initialData.id,
          updated_at: initialData.updated_at,
        };

        const res =
          type === "archive"
            ? await archiveProductAction(token)
            : await restoreProductAction(token);

        if (!res.success) {
          if (res.conflict) {
            setConflictError(res.message);
          } else {
            setGlobalError(res.message);
          }
        } else {
          setSuccessMessage(res.message);
          setActionModal(null);
          router.refresh();
        }
      } catch (err: any) {
        setGlobalError(err?.message || "An unexpected error occurred.");
      }
    });
  };

  const primaryImageUrl = initialData?.primary_image_path
    ? buildPublicStorageUrl(initialData.primary_image_path)
    : null;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-vantaire-border/60 pb-4">
        <div>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 text-xs text-vantaire-muted hover:text-vantaire-champagne transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Products</span>
          </Link>
          <h1 className="text-xl font-serif tracking-wider text-vantaire-warmWhite font-semibold">
            {mode === "create" ? "Create New Product" : `Edit Product: ${initialData?.name}`}
          </h1>
          <p className="text-xs text-vantaire-sand mt-1">
            {mode === "create"
              ? "Add a new luxury sunglasses silhouette to the catalog. New products are saved as inactive drafts."
              : `Managing legacy catalog item ${initialData?.legacy_id}. Slugs and IDs are immutable.`}
          </p>
        </div>

        {mode === "edit" && initialData && (
          <div className="flex items-center gap-3">
            {initialData.is_active ? (
              <button
                type="button"
                onClick={() => setActionModal("archive")}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive Product</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActionModal("restore")}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore & Activate</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Conflict Warning Banner */}
      {conflictError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs space-y-3 shadow-lg">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <div>
              <p className="font-semibold text-rose-300">Concurrent Modification Conflict</p>
              <p className="mt-1 leading-relaxed">{conflictError}</p>
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-semibold uppercase tracking-luxury transition-colors cursor-pointer"
            >
              Reload Latest Product Data
            </button>
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {globalError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{globalError}</span>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Edit Mode: Read-Only Identity & Relationship Overview Panel */}
      {mode === "edit" && initialData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-vantaire-charcoal/40 border border-vantaire-border/80">
          {/* Primary Image Thumbnail */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-mono tracking-luxury text-vantaire-champagne">
              Primary Image
            </label>
            <div className="w-24 h-24 bg-vantaire-black/80 border border-vantaire-border relative overflow-hidden flex items-center justify-center">
              {primaryImageUrl ? (
                <Image
                  src={primaryImageUrl}
                  alt={initialData.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <span className="text-[10px] font-mono text-vantaire-muted">No Image</span>
              )}
            </div>
            <p className="text-[10px] text-vantaire-muted">Managed via Media Library</p>
          </div>

          {/* Immutable IDs */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-mono tracking-luxury text-vantaire-champagne flex items-center gap-1">
                <span>Legacy ID</span>
                <Lock className="w-3 h-3 text-vantaire-muted" />
              </label>
              <div className="font-mono text-sm text-vantaire-warmWhite font-semibold mt-1">
                {initialData.legacy_id}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono tracking-luxury text-vantaire-champagne flex items-center gap-1">
                <span>Permanent Slug</span>
                <Lock className="w-3 h-3 text-vantaire-muted" />
              </label>
              <div className="font-mono text-xs text-vantaire-sand truncate mt-1">
                {initialData.slug}
              </div>
            </div>
          </div>

          {/* Status & Inventory */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-mono tracking-luxury text-vantaire-champagne">
                Publication Status
              </label>
              <div className="mt-1">
                {initialData.is_active ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Active on Storefront
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Archived (Hidden)
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono tracking-luxury text-vantaire-champagne">
                Merchandising Badges
              </label>
              <div className="flex flex-wrap gap-1 mt-1">
                {initialData.featured && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-vantaire-champagne/15 text-vantaire-champagne border border-vantaire-champagne/30">
                    Featured
                  </span>
                )}
                {initialData.best_seller && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    Best Seller
                  </span>
                )}
                {initialData.new_arrival && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    New Arrival
                  </span>
                )}
                {!initialData.featured && !initialData.best_seller && !initialData.new_arrival && (
                  <span className="text-xs text-vantaire-muted font-mono">None assigned</span>
                )}
              </div>
            </div>
          </div>

          {/* Assigned Collections */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-mono tracking-luxury text-vantaire-champagne">
              Collections
            </label>
            <div className="text-xs text-vantaire-sand space-y-1 mt-1">
              {initialData.collection_names && initialData.collection_names.length > 0 ? (
                initialData.collection_names.map((col) => (
                  <div key={col} className="font-mono text-[11px] text-vantaire-warmWhite">
                    • {col}
                  </div>
                ))
              ) : (
                <div className="text-vantaire-muted italic text-[11px]">No collections assigned</div>
              )}
            </div>
            <p className="text-[10px] text-vantaire-muted">Assignments managed in Collections</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Core Identification */}
        <div className="p-6 bg-vantaire-charcoal/30 border border-vantaire-border/80 space-y-6">
          <h2 className="text-xs uppercase tracking-luxury text-vantaire-champagne font-semibold border-b border-vantaire-border/40 pb-2">
            1. Core Identity & Naming
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div className="space-y-1.5">
              <label htmlFor="product-name" className="text-xs font-medium text-vantaire-sand">
                Full Product Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="product-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Noir Sovereign Aviator"
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-rose-400">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Short Name */}
            <div className="space-y-1.5">
              <label htmlFor="product-short-name" className="text-xs font-medium text-vantaire-sand">
                Short Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="product-short-name"
                type="text"
                required
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="e.g. Noir Sovereign"
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.short_name && (
                <p className="text-[11px] text-rose-400">{fieldErrors.short_name[0]}</p>
              )}
            </div>
          </div>

          {/* Slug (Editable on Create, Locked on Edit) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="product-slug" className="text-xs font-medium text-vantaire-sand flex items-center gap-1">
                <span>URL Slug</span>
                {mode === "edit" && <Lock className="w-3 h-3 text-vantaire-muted" />}
                <span className="text-rose-400">*</span>
              </label>
              {mode === "create" && (
                <button
                  type="button"
                  onClick={handleAutoSlug}
                  className="inline-flex items-center gap-1 text-[11px] text-vantaire-champagne hover:underline cursor-pointer"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Auto-generate from Name</span>
                </button>
              )}
            </div>
            <input
              id="product-slug"
              type="text"
              required
              disabled={mode === "edit"}
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="e.g. noir-sovereign-aviator"
              className={`w-full px-3 py-2 font-mono text-xs border focus:outline-none ${
                mode === "edit"
                  ? "bg-vantaire-black/40 border-vantaire-border/40 text-vantaire-muted cursor-not-allowed"
                  : "bg-vantaire-black/60 border-vantaire-border text-vantaire-warmWhite focus:border-vantaire-champagne"
              }`}
            />
            {mode === "edit" ? (
              <p className="text-[10px] text-vantaire-muted">
                Slugs are immutable after creation to protect inbound links, WhatsApp order references, and SEO rankings.
              </p>
            ) : (
              <p className="text-[10px] text-vantaire-muted">
                Lowercase letters, numbers, and hyphens only.
              </p>
            )}
            {fieldErrors.slug && (
              <p className="text-[11px] text-rose-400">{fieldErrors.slug[0]}</p>
            )}
          </div>
        </div>

        {/* Section 2: Pricing & Inventory */}
        <div className="p-6 bg-vantaire-charcoal/30 border border-vantaire-border/80 space-y-6">
          <h2 className="text-xs uppercase tracking-luxury text-vantaire-champagne font-semibold border-b border-vantaire-border/40 pb-2">
            2. Pricing & Operational Inventory
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Price */}
            <div className="space-y-1.5">
              <label htmlFor="product-price" className="text-xs font-medium text-vantaire-sand">
                Selling Price (৳ BDT) <span className="text-rose-400">*</span>
              </label>
              <input
                id="product-price"
                type="number"
                min="0"
                step="1"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="3500"
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite font-mono focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.price && (
                <p className="text-[11px] text-rose-400">{fieldErrors.price[0]}</p>
              )}
            </div>

            {/* Compare-at Price */}
            <div className="space-y-1.5">
              <label htmlFor="product-compare-price" className="text-xs font-medium text-vantaire-sand">
                Compare-at Price (৳ BDT) <span className="text-vantaire-muted text-[10px]">(Optional)</span>
              </label>
              <input
                id="product-compare-price"
                type="number"
                min="0"
                step="1"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                placeholder="4200"
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite font-mono focus:outline-none focus:border-vantaire-champagne"
              />
              <p className="text-[10px] text-vantaire-muted">Must be ≥ selling price to show strikethrough savings.</p>
              {fieldErrors.compare_at_price && (
                <p className="text-[11px] text-rose-400">{fieldErrors.compare_at_price[0]}</p>
              )}
            </div>

            {/* Inventory In-Stock Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-vantaire-sand">
                Inventory Availability
              </label>
              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="w-4 h-4 accent-vantaire-champagne rounded-none"
                  />
                  <span className="text-xs text-vantaire-warmWhite">
                    {inStock ? "In Stock (Available for ordering)" : "Out of Stock (Ordering disabled)"}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Silhouettes & Technical Specs */}
        <div className="p-6 bg-vantaire-charcoal/30 border border-vantaire-border/80 space-y-6">
          <h2 className="text-xs uppercase tracking-luxury text-vantaire-champagne font-semibold border-b border-vantaire-border/40 pb-2">
            3. Frame & Lens Specifications
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Category */}
            <div className="space-y-1.5">
              <label htmlFor="product-category" className="text-xs font-medium text-vantaire-sand">
                Category
              </label>
              <input
                id="product-category"
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Sunglasses"
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label htmlFor="product-gender" className="text-xs font-medium text-vantaire-sand">
                Gender Classification
              </label>
              <select
                id="product-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              >
                <option value="Unisex">Unisex</option>
                <option value="Men">Men</option>
                <option value="Women">Women</option>
              </select>
            </div>

            {/* Fit */}
            <div className="space-y-1.5">
              <label htmlFor="product-fit" className="text-xs font-medium text-vantaire-sand">
                Fit Profile
              </label>
              <select
                id="product-fit"
                value={fit}
                onChange={(e) => setFit(e.target.value as any)}
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              >
                <option value="Universal">Universal</option>
                <option value="Medium">Medium</option>
                <option value="Narrow">Narrow</option>
                <option value="Wide">Wide</option>
              </select>
            </div>

            {/* Frame Shape */}
            <div className="space-y-1.5">
              <label htmlFor="product-frame-shape" className="text-xs font-medium text-vantaire-sand">
                Frame Shape <span className="text-rose-400">*</span>
              </label>
              <select
                id="product-frame-shape"
                value={frameShape}
                onChange={(e) => setFrameShape(e.target.value)}
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              >
                {FRAME_SHAPES.map((shape) => (
                  <option key={shape} value={shape}>
                    {shape}
                  </option>
                ))}
              </select>
            </div>

            {/* Frame Look / Material */}
            <div className="space-y-1.5">
              <label htmlFor="product-frame-look" className="text-xs font-medium text-vantaire-sand">
                Frame Look / Material <span className="text-rose-400">*</span>
              </label>
              <input
                id="product-frame-look"
                type="text"
                required
                value={frameLook}
                onChange={(e) => setFrameLook(e.target.value)}
                placeholder="e.g. Dark Metal-Look Alloy"
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.frame_look && (
                <p className="text-[11px] text-rose-400">{fieldErrors.frame_look[0]}</p>
              )}
            </div>

            {/* Frame Color */}
            <div className="space-y-1.5">
              <label htmlFor="product-frame-color" className="text-xs font-medium text-vantaire-sand">
                Frame Color <span className="text-rose-400">*</span>
              </label>
              <input
                id="product-frame-color"
                type="text"
                required
                value={frameColor}
                onChange={(e) => setFrameColor(e.target.value)}
                placeholder="e.g. Matte Obsidian Black"
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.frame_color && (
                <p className="text-[11px] text-rose-400">{fieldErrors.frame_color[0]}</p>
              )}
            </div>

            {/* Lens Color */}
            <div className="space-y-1.5">
              <label htmlFor="product-lens-color" className="text-xs font-medium text-vantaire-sand">
                Lens Color <span className="text-rose-400">*</span>
              </label>
              <input
                id="product-lens-color"
                type="text"
                required
                value={lensColor}
                onChange={(e) => setLensColor(e.target.value)}
                placeholder="e.g. Deep Charcoal Tint"
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.lens_color && (
                <p className="text-[11px] text-rose-400">{fieldErrors.lens_color[0]}</p>
              )}
            </div>

            {/* Lens Type */}
            <div className="space-y-1.5">
              <label htmlFor="product-lens-type" className="text-xs font-medium text-vantaire-sand">
                Lens Type <span className="text-rose-400">*</span>
              </label>
              <select
                id="product-lens-type"
                value={lensType}
                onChange={(e) => setLensType(e.target.value)}
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              >
                {LENS_TYPES.map((lt) => (
                  <option key={lt} value={lt}>
                    {lt}
                  </option>
                ))}
              </select>
            </div>

            {/* Style Category */}
            <div className="space-y-1.5">
              <label htmlFor="product-style-cat" className="text-xs font-medium text-vantaire-sand">
                Style Category <span className="text-rose-400">*</span>
              </label>
              <input
                id="product-style-cat"
                type="text"
                required
                value={styleCategory}
                onChange={(e) => setStyleCategory(e.target.value)}
                placeholder="e.g. Architectural, Contemporary, Retro"
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
            </div>
          </div>

          {/* Badge */}
          <div className="space-y-1.5">
            <label htmlFor="product-badge" className="text-xs font-medium text-vantaire-sand">
              Visual Badge Overlay <span className="text-vantaire-muted text-[10px]">(Optional pill on storefront)</span>
            </label>
            <input
              id="product-badge"
              type="text"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="e.g. Bestseller, Limited Edition, Signature Edit"
              className="w-full max-w-sm px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
            />
          </div>
        </div>

        {/* Section 4: Descriptions & Feature Highlights */}
        <div className="p-6 bg-vantaire-charcoal/30 border border-vantaire-border/80 space-y-6">
          <h2 className="text-xs uppercase tracking-luxury text-vantaire-champagne font-semibold border-b border-vantaire-border/40 pb-2">
            4. Copywriting & Feature Highlights
          </h2>

          <div className="space-y-4">
            {/* Short Description */}
            <div className="space-y-1.5">
              <label htmlFor="product-short-desc" className="text-xs font-medium text-vantaire-sand">
                Short Description (Card Teaser) <span className="text-rose-400">*</span>
              </label>
              <input
                id="product-short-desc"
                type="text"
                required
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="One sentence summary of the silhouette character."
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.short_description && (
                <p className="text-[11px] text-rose-400">{fieldErrors.short_description[0]}</p>
              )}
            </div>

            {/* Full Editorial Description */}
            <div className="space-y-1.5">
              <label htmlFor="product-desc" className="text-xs font-medium text-vantaire-sand">
                Full Editorial Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="product-desc"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive editorial description of the design, craftsmanship, and styling character..."
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne leading-relaxed"
              />
              {fieldErrors.description && (
                <p className="text-[11px] text-rose-400">{fieldErrors.description[0]}</p>
              )}
            </div>

            {/* Feature Bullets */}
            <div className="space-y-1.5">
              <label htmlFor="product-features" className="text-xs font-medium text-vantaire-sand">
                Features & Craftsmanship Bullets (One bullet per line) <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="product-features"
                required
                rows={4}
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                placeholder={`Classic dual-bar aviator brow profile\nMatte obsidian dark finish\nCharcoal-tinted sun lens appearance\nAdjustable cushioned nose pads`}
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite font-mono focus:outline-none focus:border-vantaire-champagne leading-relaxed"
              />
              <p className="text-[10px] text-vantaire-muted">
                Each line will be rendered as a discrete bullet point on the product detail page.
              </p>
              {fieldErrors.features && (
                <p className="text-[11px] text-rose-400">{fieldErrors.features[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: SEO & Metadata */}
        <div className="p-6 bg-vantaire-charcoal/30 border border-vantaire-border/80 space-y-6">
          <h2 className="text-xs uppercase tracking-luxury text-vantaire-champagne font-semibold border-b border-vantaire-border/40 pb-2">
            5. SEO & Metadata
          </h2>

          <div className="space-y-4">
            {/* SEO Title */}
            <div className="space-y-1.5">
              <label htmlFor="product-seo-title" className="text-xs font-medium text-vantaire-sand">
                Meta SEO Title <span className="text-rose-400">*</span>
              </label>
              <input
                id="product-seo-title"
                type="text"
                required
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="e.g. Noir Sovereign Aviator Sunglasses | VANTAIRE EYEWEAR"
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.seo_title && (
                <p className="text-[11px] text-rose-400">{fieldErrors.seo_title[0]}</p>
              )}
            </div>

            {/* SEO Description */}
            <div className="space-y-1.5">
              <label htmlFor="product-seo-desc" className="text-xs font-medium text-vantaire-sand">
                Meta SEO Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="product-seo-desc"
                required
                rows={2}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="e.g. Explore the Noir Sovereign Aviator sunglasses by VANTAIRE. Matte obsidian styling with nationwide delivery across Bangladesh."
                className="w-full px-3 py-2 bg-vantaire-black/60 border border-vantaire-border text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne leading-relaxed"
              />
              {fieldErrors.seo_description && (
                <p className="text-[11px] text-rose-400">{fieldErrors.seo_description[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-vantaire-border/60">
          <Link
            href="/admin/products"
            className="px-5 py-2.5 text-xs text-vantaire-sand hover:text-vantaire-warmWhite border border-vantaire-border transition-colors cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-vantaire-champagne text-vantaire-black font-semibold text-xs uppercase tracking-luxury hover:bg-vantaire-champagne/90 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            <span>{mode === "create" ? "Create Product" : "Save Changes"}</span>
          </button>
        </div>
      </form>

      {/* Archive / Restore Confirmation Modal for Edit Mode */}
      {actionModal && initialData && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="bg-vantaire-charcoal border border-vantaire-border w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-serif tracking-wider uppercase font-semibold text-vantaire-warmWhite">
              {actionModal === "archive" ? "Archive Product" : "Restore & Activate Product"}
            </h3>

            <p className="text-xs text-vantaire-sand leading-relaxed">
              {actionModal === "archive" ? (
                <>
                  Archiving <strong>&ldquo;{initialData.name}&rdquo;</strong> will deactivate it and hide it from the public storefront immediately.
                </>
              ) : (
                <>
                  Restoring <strong>&ldquo;{initialData.name}&rdquo;</strong> will activate it on the public storefront. A primary product image is required.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setActionModal(null)}
                className="px-4 py-2 text-xs text-vantaire-sand hover:text-vantaire-warmWhite border border-vantaire-border transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleArchiveRestore(actionModal)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-luxury transition-colors cursor-pointer ${
                  actionModal === "archive"
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{actionModal === "archive" ? "Confirm Archive" : "Confirm Restore"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
