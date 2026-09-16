"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Archive,
  RotateCcw,
  Upload,
  Trash2,
  MoveUp,
  MoveDown,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Layers,
  Image as ImageIcon,
  Sparkles,
  Info,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { buildPublicStorageUrl } from "@/lib/data/media";
import {
  updateCollectionAction,
  archiveCollectionAction,
  restoreCollectionAction,
  saveCollectionMembershipAction,
  uploadCollectionCoverAction,
  replaceCollectionCoverAction,
  removeCollectionCoverAction,
  getCollectionCoverOrphansAction,
  cleanupCollectionCoverOrphanAction,
  CollectionCoverOrphanInfo,
} from "@/lib/admin/collection-actions";
import { Tables } from "@/types/database.types";

export interface CatalogProductSummary {
  id: string;
  legacy_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  in_stock: boolean;
  primary_image_path: string | null;
}

export interface CollectionMembershipItem {
  product_id: string;
  position: number;
}

interface CollectionEditFormProps {
  collection: Tables<"collections">;
  assignedMembers: CollectionMembershipItem[];
  allCatalogProducts: CatalogProductSummary[];
}

export function CollectionEditForm({
  collection,
  assignedMembers,
  allCatalogProducts,
}: CollectionEditFormProps) {
  const router = useRouter();

  // Core fields state
  const [name, setName] = useState(collection.name);
  const [tagline, setTagline] = useState(collection.tagline);
  const [description, setDescription] = useState(collection.description);

  // Status & Concurrency state
  const [currentUpdatedAt, setCurrentUpdatedAt] = useState(collection.updated_at);
  const [isActive, setIsActive] = useState(collection.is_active);
  const [coverImage, setCoverImage] = useState<string | null>(collection.cover_image);

  // Membership state: ordered list of product IDs
  const initialOrderedIds = useMemo(() => {
    return [...assignedMembers]
      .sort((a, b) => a.position - b.position)
      .map((m) => m.product_id);
  }, [assignedMembers]);

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(initialOrderedIds);
  const [productSearch, setProductSearch] = useState("");

  // Cover upload state
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [orphans, setOrphans] = useState<CollectionCoverOrphanInfo[]>([]);
  const [scanningOrphans, setScanningOrphans] = useState(false);

  // Feedback state
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Transitions
  const [isSavingDetails, startSavingDetails] = useTransition();
  const [isSavingMembership, startSavingMembership] = useTransition();
  const [isUploadingCover, startUploadingCover] = useTransition();
  const [isChangingLifecycle, startChangingLifecycle] = useTransition();

  const productMap = useMemo(() => {
    const map = new Map<string, CatalogProductSummary>();
    for (const p of allCatalogProducts) {
      map.set(p.id, p);
    }
    return map;
  }, [allCatalogProducts]);

  // Handle Cover File Selection
  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  // 1. Save Core Details
  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    setSuccessNotice(null);
    setFieldErrors({});

    startSavingDetails(async () => {
      const res = await updateCollectionAction({
        id: collection.id,
        updated_at: currentUpdatedAt,
        name,
        tagline,
        description,
      });

      if (res.success && res.data) {
        setCurrentUpdatedAt(res.data.updated_at);
        setSuccessNotice(res.message);
        router.refresh();
      } else {
        if (res.errors) setFieldErrors(res.errors);
        setErrorNotice(res.message);
      }
    });
  };

  // 2. Upload / Replace Cover
  const handleUploadCover = () => {
    if (!coverFile) return;
    setErrorNotice(null);
    setSuccessNotice(null);

    const formData = new FormData();
    formData.append("collectionId", collection.id);
    formData.append("updatedAt", currentUpdatedAt);
    formData.append("file", coverFile);

    startUploadingCover(async () => {
      const res = coverImage
        ? await replaceCollectionCoverAction(formData)
        : await uploadCollectionCoverAction(formData);

      if (res.success && res.data) {
        setCoverImage(res.data.storagePath);
        setCurrentUpdatedAt(res.data.updatedAt);
        setCoverFile(null);
        setCoverPreview(null);
        setSuccessNotice(res.message);
        router.refresh();
      } else {
        setErrorNotice(res.message);
      }
    });
  };

  // 3. Remove Cover (Only if Inactive)
  const handleRemoveCover = () => {
    if (!coverImage) return;
    if (isActive) {
      setErrorNotice("Active collections must maintain a cover image. Archive the collection first.");
      return;
    }

    if (!confirm("Are you sure you want to remove the cover image?")) return;

    setErrorNotice(null);
    setSuccessNotice(null);

    startUploadingCover(async () => {
      const res = await removeCollectionCoverAction({
        id: collection.id,
        updated_at: currentUpdatedAt,
      });

      if (res.success && res.data) {
        setCoverImage(null);
        setCurrentUpdatedAt(res.data.updatedAt);
        setCoverFile(null);
        setCoverPreview(null);
        setSuccessNotice(res.message);
        router.refresh();
      } else {
        setErrorNotice(res.message);
      }
    });
  };

  // 4. Scan & Clean Orphans
  const handleScanOrphans = async () => {
    setScanningOrphans(true);
    setErrorNotice(null);
    const res = await getCollectionCoverOrphansAction(collection.id);
    setScanningOrphans(false);
    if (res.success && res.data) {
      setOrphans(res.data);
    } else {
      setErrorNotice(res.message);
    }
  };

  const handleDeleteOrphan = async (storagePath: string) => {
    if (!confirm(`Delete orphaned file '${storagePath}'?`)) return;
    setErrorNotice(null);
    const res = await cleanupCollectionCoverOrphanAction(collection.id, storagePath);
    if (res.success) {
      setOrphans((prev) => prev.filter((o) => o.storagePath !== storagePath));
      setSuccessNotice(res.message);
    } else {
      setErrorNotice(res.message);
    }
  };

  // 5. Membership Ordering Handlers
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setSelectedProductIds((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedProductIds.length - 1) return;
    setSelectedProductIds((prev) => {
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleToggleProduct = (productId: string) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSaveMembership = () => {
    setErrorNotice(null);
    setSuccessNotice(null);

    startSavingMembership(async () => {
      const res = await saveCollectionMembershipAction({
        collection_id: collection.id,
        updated_at: currentUpdatedAt,
        product_ids: selectedProductIds,
      });

      if (res.success && res.data) {
        setCurrentUpdatedAt(res.data.updatedAt);
        setSuccessNotice(res.message);
        router.refresh();
      } else {
        setErrorNotice(res.message);
      }
    });
  };

  // 6. Lifecycle Handlers (Archive / Restore)
  const handleArchive = () => {
    if (!confirm(`Archive collection '${collection.name}'? It will be hidden from the storefront.`)) {
      return;
    }

    setErrorNotice(null);
    setSuccessNotice(null);

    startChangingLifecycle(async () => {
      const res = await archiveCollectionAction({
        id: collection.id,
        updated_at: currentUpdatedAt,
      });

      if (res.success && res.data) {
        setIsActive(false);
        setCurrentUpdatedAt(res.data.updated_at);
        setSuccessNotice(res.message);
        router.refresh();
      } else {
        setErrorNotice(res.message);
      }
    });
  };

  const handleRestore = () => {
    setErrorNotice(null);
    setSuccessNotice(null);

    startChangingLifecycle(async () => {
      const res = await restoreCollectionAction({
        id: collection.id,
        updated_at: currentUpdatedAt,
      });

      if (res.success && res.data) {
        setIsActive(true);
        setCurrentUpdatedAt(res.data.updated_at);
        setSuccessNotice(res.message);
        router.refresh();
      } else {
        setErrorNotice(res.message);
      }
    });
  };

  // Unselected products filtered by search
  const availableProducts = useMemo(() => {
    return allCatalogProducts.filter((p) => {
      if (selectedProductIds.includes(p.id)) return false;
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase().trim();
        return (
          p.name.toLowerCase().includes(q) ||
          p.legacy_id.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allCatalogProducts, selectedProductIds, productSearch]);

  const activeAssignedCount = useMemo(() => {
    return selectedProductIds.filter((id) => productMap.get(id)?.is_active === true).length;
  }, [selectedProductIds, productMap]);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Banner Notice Alerts */}
      {errorNotice && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-800/80 text-red-200 text-xs rounded"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-mono">{errorNotice}</div>
          <button
            type="button"
            onClick={() => setErrorNotice(null)}
            className="text-red-400 hover:text-red-200 font-bold"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {successNotice && (
        <div
          role="status"
          className="flex items-start gap-3 p-4 bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 text-xs rounded"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-mono">{successNotice}</div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 font-bold"
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* Publication & Lifecycle Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-vantaire-charcoal/40 border border-vantaire-border/80">
        <div className="flex items-center gap-3">
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase bg-emerald-950/70 text-emerald-300 border border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Published Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono uppercase bg-amber-950/70 text-amber-300 border border-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Archived Draft
            </span>
          )}

          <span className="text-xs font-mono text-vantaire-muted">
            {selectedProductIds.length} Assigned Products ({activeAssignedCount} active)
          </span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isActive && (
            <Link
              href={`/collections/${collection.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-vantaire-border/80 text-xs font-mono text-vantaire-sand hover:text-vantaire-champagne hover:bg-vantaire-charcoal/60 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Storefront</span>
            </Link>
          )}

          {isActive ? (
            <button
              type="button"
              onClick={handleArchive}
              disabled={isChangingLifecycle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-950/50 text-amber-300 border border-amber-800/80 hover:bg-amber-900/60 text-xs font-mono transition-colors disabled:opacity-50"
            >
              {isChangingLifecycle ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              <span>Archive Collection</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRestore}
              disabled={isChangingLifecycle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/50 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900/60 text-xs font-mono transition-colors disabled:opacity-50"
            >
              {isChangingLifecycle ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              <span>Publish & Restore</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: Collection Information Form */}
      <form onSubmit={handleSaveDetails} className="space-y-4">
        <div className="p-6 bg-vantaire-charcoal/30 border border-vantaire-border/80 space-y-5">
          <div className="flex items-center justify-between border-b border-vantaire-border/60 pb-3">
            <h2 className="text-xs uppercase tracking-luxury text-vantaire-champagne font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Collection Editorial Information
            </h2>
            <button
              type="submit"
              disabled={isSavingDetails}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-vantaire-champagne text-vantaire-black hover:bg-vantaire-champagne/90 text-xs font-semibold tracking-luxury uppercase transition-colors disabled:opacity-50"
            >
              {isSavingDetails ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Details</span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="edit-col-name"
                className="block text-xs font-mono uppercase tracking-wider text-vantaire-sand"
              >
                Collection Name
              </label>
              <input
                id="edit-col-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-vantaire-charcoal/60 border border-vantaire-border/80 text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-red-400 font-mono">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Slug (Read Only) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="edit-col-slug"
                  className="block text-xs font-mono uppercase tracking-wider text-vantaire-sand"
                >
                  Public Route Slug
                </label>
                <span className="text-[10px] font-mono text-vantaire-champagne flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Immutable
                </span>
              </div>
              <input
                id="edit-col-slug"
                type="text"
                readOnly
                disabled
                value={collection.slug}
                className="w-full px-3.5 py-2 bg-vantaire-black/50 border border-vantaire-border/60 text-xs font-mono text-vantaire-muted cursor-not-allowed select-all"
              />
              <p className="text-[10px] text-vantaire-muted">
                Public URL: /collections/{collection.slug}
              </p>
            </div>
          </div>

          {/* Tagline */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-col-tagline"
              className="block text-xs font-mono uppercase tracking-wider text-vantaire-sand"
            >
              Tagline
            </label>
            <input
              id="edit-col-tagline"
              type="text"
              required
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3.5 py-2 bg-vantaire-charcoal/60 border border-vantaire-border/80 text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
            />
            {fieldErrors.tagline && (
              <p className="text-[11px] text-red-400 font-mono">{fieldErrors.tagline[0]}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-col-desc"
              className="block text-xs font-mono uppercase tracking-wider text-vantaire-sand"
            >
              Editorial Description
            </label>
            <textarea
              id="edit-col-desc"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-vantaire-charcoal/60 border border-vantaire-border/80 text-xs text-vantaire-warmWhite focus:outline-none focus:border-vantaire-champagne"
            />
            {fieldErrors.description && (
              <p className="text-[11px] text-red-400 font-mono">{fieldErrors.description[0]}</p>
            )}
          </div>
        </div>
      </form>

      {/* SECTION 2: Cover Media Integration */}
      <div className="p-6 bg-vantaire-charcoal/30 border border-vantaire-border/80 space-y-6">
        <div className="flex items-center justify-between border-b border-vantaire-border/60 pb-3">
          <h2 className="text-xs uppercase tracking-luxury text-vantaire-champagne font-semibold flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Collection Cover Media
          </h2>
          <span className="text-[11px] font-mono text-vantaire-muted">
            Max 5 MB • JPEG, PNG, WebP
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Cover Display */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono text-vantaire-sand uppercase tracking-wider">
              Current Cover Asset
            </h3>
            <div className="aspect-[16/9] w-full bg-vantaire-black border border-vantaire-border/80 relative flex items-center justify-center overflow-hidden">
              {coverPreview ? (
                <Image
                  src={coverPreview}
                  alt="Cover preview"
                  fill
                  sizes="400px"
                  className="object-cover"
                  unoptimized
                />
              ) : coverImage ? (
                <Image
                  src={buildPublicStorageUrl(coverImage)}
                  alt={`${collection.name} Cover`}
                  fill
                  sizes="400px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <ImageIcon className="w-8 h-8 text-vantaire-muted/60 mx-auto" />
                  <p className="text-xs text-vantaire-muted">
                    No cover image assigned.
                  </p>
                  <p className="text-[11px] text-amber-300 font-mono">
                    Required before publication
                  </p>
                </div>
              )}
            </div>

            {coverImage && (
              <div className="flex items-center justify-between text-[11px] font-mono text-vantaire-muted">
                <span className="truncate max-w-[280px]" title={coverImage}>
                  {coverImage}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  disabled={isUploadingCover || isActive}
                  title={
                    isActive
                      ? "Active collections cannot remove cover. Archive first."
                      : "Remove cover image"
                  }
                  className={`inline-flex items-center gap-1 text-xs font-mono transition-colors ${
                    isActive
                      ? "text-vantaire-muted/40 cursor-not-allowed"
                      : "text-red-400 hover:text-red-300"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Cover</span>
                </button>
              </div>
            )}
          </div>

          {/* Upload / Replace Panel */}
          <div className="space-y-4 bg-vantaire-charcoal/40 p-4 border border-vantaire-border/60">
            <h3 className="text-xs font-mono text-vantaire-sand uppercase tracking-wider">
              {coverImage ? "Replace Cover Image" : "Upload New Cover"}
            </h3>
            <p className="text-xs text-vantaire-muted">
              Uploaded files are stored content-addressed under{" "}
              <code className="text-vantaire-champagne text-[11px]">
                collections/{collection.slug}/cover-&#123;hash&#125;
              </code>
              . Magic byte signatures and MIME types are verified server-side.
            </p>

            <div className="space-y-2">
              <input
                id="collection-cover-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverFileChange}
                className="w-full text-xs text-vantaire-sand file:mr-3 file:py-2 file:px-4 file:border file:border-vantaire-border/80 file:text-xs file:font-mono file:bg-vantaire-charcoal/80 file:text-vantaire-warmWhite hover:file:border-vantaire-champagne cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleUploadCover}
              disabled={!coverFile || isUploadingCover}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-vantaire-champagne text-vantaire-black hover:bg-vantaire-champagne/90 text-xs font-semibold tracking-luxury uppercase transition-colors disabled:opacity-50"
            >
              {isUploadingCover ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading & Verifying...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>{coverImage ? "Replace Cover Image" : "Upload Cover Image"}</span>
                </>
              )}
            </button>

            {/* Orphan Scanner */}
            <div className="pt-3 border-t border-vantaire-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-vantaire-muted">
                  Storage Hygiene
                </span>
                <button
                  type="button"
                  onClick={handleScanOrphans}
                  disabled={scanningOrphans}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-vantaire-sand hover:text-vantaire-champagne"
                >
                  <RefreshCw className={`w-3 h-3 ${scanningOrphans ? "animate-spin" : ""}`} />
                  <span>Scan Orphans</span>
                </button>
              </div>

              {orphans.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {orphans.map((orp) => (
                    <div
                      key={orp.storagePath}
                      className="flex items-center justify-between p-2 bg-vantaire-black/50 border border-vantaire-border/60 text-[11px] font-mono"
                    >
                      <span className="truncate max-w-[200px]" title={orp.name}>
                        {orp.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteOrphan(orp.storagePath)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Delete orphan"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Product Membership Assignment & Ordering */}
      <div className="p-6 bg-vantaire-charcoal/30 border border-vantaire-border/80 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-vantaire-border/60 pb-3">
          <div>
            <h2 className="text-xs uppercase tracking-luxury text-vantaire-champagne font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Product Membership & Ordered Curation
            </h2>
            <p className="text-[11px] text-vantaire-muted">
              Array order dictates the exact display sequence on <code className="text-vantaire-champagne">/collections/{collection.slug}</code>.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveMembership}
            disabled={isSavingMembership}
            className="inline-flex items-center gap-2 px-5 py-2 bg-vantaire-champagne text-vantaire-black hover:bg-vantaire-champagne/90 text-xs font-semibold tracking-luxury uppercase transition-colors disabled:opacity-50"
          >
            {isSavingMembership ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Sequence...</span>
              </>
            ) : (
              <span>Save Membership ({selectedProductIds.length})</span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: Ordered Assigned Members */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono text-vantaire-sand uppercase tracking-wider">
                Assigned Silhouettes ({selectedProductIds.length})
              </h3>
              <span className="text-[11px] font-mono text-vantaire-muted">
                Contiguous Positions: 0 .. {Math.max(0, selectedProductIds.length - 1)}
              </span>
            </div>

            {selectedProductIds.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-vantaire-border/80 text-xs text-vantaire-muted">
                No products assigned yet. Select items from the catalog pool on the right.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {selectedProductIds.map((prodId, idx) => {
                  const prod = productMap.get(prodId);
                  if (!prod) return null;
                  const thumbUrl = prod.primary_image_path
                    ? buildPublicStorageUrl(prod.primary_image_path)
                    : null;

                  return (
                    <div
                      key={prodId}
                      className="flex items-center justify-between gap-3 p-2.5 bg-vantaire-charcoal/50 border border-vantaire-border/80 hover:border-vantaire-champagne/60 transition-colors"
                    >
                      {/* Position & Thumbnail */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 font-mono text-xs text-vantaire-champagne font-bold text-center">
                          {idx}
                        </span>
                        <div className="w-10 h-7 bg-vantaire-black border border-vantaire-border/60 relative flex items-center justify-center overflow-hidden shrink-0">
                          {thumbUrl ? (
                            <Image
                              src={thumbUrl}
                              alt={prod.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <ImageIcon className="w-3 h-3 text-vantaire-muted/60" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-vantaire-warmWhite truncate">
                            {prod.name}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-vantaire-muted">
                            <span>{prod.legacy_id}</span>
                            <span>•</span>
                            <span className={prod.is_active ? "text-emerald-400" : "text-amber-400"}>
                              {prod.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Reorder and Remove Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1 text-vantaire-sand/70 hover:text-vantaire-warmWhite hover:bg-vantaire-black/50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title="Move up"
                          aria-label={`Move ${prod.name} up`}
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === selectedProductIds.length - 1}
                          className="p-1 text-vantaire-sand/70 hover:text-vantaire-warmWhite hover:bg-vantaire-black/50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                          title="Move down"
                          aria-label={`Move ${prod.name} down`}
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleProduct(prodId)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors ml-1"
                          title="Remove from collection"
                          aria-label={`Remove ${prod.name}`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Catalog Pool with Search */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono text-vantaire-sand uppercase tracking-wider">
                Available Catalog Pool ({availableProducts.length})
              </h3>
            </div>

            {/* Product search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vantaire-muted pointer-events-none" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Filter catalog products..."
                aria-label="Filter catalog products"
                className="w-full pl-9 pr-3 py-1.5 bg-vantaire-charcoal/60 border border-vantaire-border/80 text-xs text-vantaire-warmWhite placeholder:text-vantaire-muted focus:outline-none focus:border-vantaire-champagne"
              />
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {availableProducts.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-vantaire-border/60 text-xs text-vantaire-muted">
                  No unassigned products match your filter.
                </div>
              ) : (
                availableProducts.map((prod) => {
                  const thumbUrl = prod.primary_image_path
                    ? buildPublicStorageUrl(prod.primary_image_path)
                    : null;

                  return (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between gap-3 p-2 bg-vantaire-charcoal/40 border border-vantaire-border/60 hover:border-vantaire-border transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-7 bg-vantaire-black border border-vantaire-border/60 relative flex items-center justify-center overflow-hidden shrink-0">
                          {thumbUrl ? (
                            <Image
                              src={thumbUrl}
                              alt={prod.name}
                              fill
                              sizes="40px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <ImageIcon className="w-3 h-3 text-vantaire-muted/60" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-vantaire-warmWhite truncate">
                            {prod.name}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-vantaire-muted">
                            <span>{prod.legacy_id}</span>
                            <span>•</span>
                            <span className={prod.is_active ? "text-emerald-400" : "text-amber-400"}>
                              {prod.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleProduct(prod.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-vantaire-charcoal/80 border border-vantaire-border text-vantaire-sand hover:text-vantaire-champagne hover:border-vantaire-champagne text-xs font-mono transition-colors shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: System Information */}
      <div className="p-6 bg-vantaire-charcoal/20 border border-vantaire-border/60 space-y-3 text-xs font-mono text-vantaire-muted">
        <h3 className="text-xs uppercase tracking-luxury text-vantaire-sand font-semibold">
          System Metadata & Concurrency Diagnostics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div>
            <span className="block text-[10px] uppercase text-vantaire-muted">
              Internal UUID
            </span>
            <span className="text-[11px] text-vantaire-warmWhite select-all">
              {collection.id}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-vantaire-muted">
              Sort Order (Global)
            </span>
            <span className="text-[11px] text-vantaire-warmWhite">
              {collection.sort_order}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-vantaire-muted">
              Created Timestamp
            </span>
            <span className="text-[11px] text-vantaire-warmWhite">
              {new Date(collection.created_at).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="block text-[10px] uppercase text-vantaire-muted">
              Concurrency Token (updated_at)
            </span>
            <span className="text-[11px] text-vantaire-warmWhite truncate block" title={currentUpdatedAt}>
              {currentUpdatedAt}
            </span>
          </div>
        </div>
      </div>

      {/* Back Link */}
      <div className="pt-2">
        <Link
          href="/admin/collections"
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-vantaire-border/80 text-xs font-mono text-vantaire-sand hover:text-vantaire-warmWhite hover:bg-vantaire-charcoal/60 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Collections</span>
        </Link>
      </div>
    </div>
  );
}
