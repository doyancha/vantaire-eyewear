"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Star,
  Trash2,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Edit2,
  Check,
  X,
  AlertCircle,
  Copy,
} from "lucide-react";
import { buildPublicStorageUrl } from "@/lib/data/media";
import {
  setPrimaryImageAction,
  reorderProductImagesAction,
  removeProductImageAction,
  updateImageAltTextAction,
  replaceProductImageAction,
} from "@/lib/admin/media-actions";
import { Tables } from "@/types/database.types";

interface ProductMediaGalleryProps {
  productId: string;
  productSlug: string;
  productName: string;
  isActive: boolean;
  initialImages: Tables<"product_images">[];
  onRefresh?: () => void;
}

export function ProductMediaGallery({
  productId,
  productName,
  isActive,
  initialImages,
  onRefresh,
}: ProductMediaGalleryProps) {
  const [images, setImages] = useState<Tables<"product_images">[]>(initialImages);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const [editingAltId, setEditingAltId] = useState<string | null>(null);
  const [altDraft, setAltDraft] = useState<string>("");
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleCopy = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // 1. Set Primary Image
  const handleSetPrimary = async (imageId: string) => {
    setLoadingAction(`primary-${imageId}`);
    try {
      const res = await setPrimaryImageAction(productId, imageId);
      if (res.success) {
        setImages((prev) =>
          prev.map((img) => ({
            ...img,
            is_primary: img.id === imageId,
          }))
        );
        showFeedback("success", "Primary image updated.");
        onRefresh?.();
      } else {
        showFeedback("error", res.message);
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to update primary image.");
    } finally {
      setLoadingAction(null);
    }
  };

  // 2. Reorder Images
  const handleMove = async (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const newImages = [...images];
    const [moved] = newImages.splice(index, 1);
    newImages.splice(targetIndex, 0, moved);

    // Update sort_order locally
    const reordered = newImages.map((img, idx) => ({ ...img, sort_order: idx }));
    setImages(reordered);

    setLoadingAction("reorder");
    try {
      const ids = reordered.map((img) => img.id);
      const res = await reorderProductImagesAction(productId, ids);
      if (res.success) {
        showFeedback("success", "Image order saved.");
        onRefresh?.();
      } else {
        // Rollback
        setImages(images);
        showFeedback("error", res.message);
      }
    } catch (err: any) {
      setImages(images);
      showFeedback("error", err.message || "Failed to save order.");
    } finally {
      setLoadingAction(null);
    }
  };

  // 3. Remove Image
  const handleRemove = async (imageId: string, isPrimary: boolean) => {
    if (isActive && images.length <= 1) {
      showFeedback(
        "error",
        "Cannot remove the only image of an active product. Deactivate the product first or upload a replacement."
      );
      return;
    }

    const confirmMsg = isPrimary
      ? "This is the PRIMARY image. Removing it will automatically promote the next image to primary. Continue?"
      : "Are you sure you want to remove this image? This action will delete the image from storage.";

    if (!window.confirm(confirmMsg)) return;

    setLoadingAction(`remove-${imageId}`);
    try {
      const res = await removeProductImageAction(productId, imageId);
      if (res.success) {
        const promotedId = res.data?.promotedId;
        setImages((prev) =>
          prev
            .filter((img) => img.id !== imageId)
            .map((img) => ({
              ...img,
              is_primary: promotedId ? img.id === promotedId : img.is_primary,
            }))
        );
        showFeedback("success", "Image removed successfully.");
        onRefresh?.();
      } else {
        showFeedback("error", res.message);
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to remove image.");
    } finally {
      setLoadingAction(null);
    }
  };

  // 4. Update Alt Text
  const handleSaveAlt = async (imageId: string) => {
    setLoadingAction(`alt-${imageId}`);
    try {
      const res = await updateImageAltTextAction(productId, imageId, altDraft);
      if (res.success) {
        setImages((prev) =>
          prev.map((img) => (img.id === imageId ? { ...img, alt_text: altDraft } : img))
        );
        setEditingAltId(null);
        showFeedback("success", "Alt text updated.");
        onRefresh?.();
      } else {
        showFeedback("error", res.message);
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to update alt text.");
    } finally {
      setLoadingAction(null);
    }
  };

  // 5. Replace Image
  const handleFileReplace = async (imageId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("imageId", imageId);
    formData.append("file", file);

    setLoadingAction(`replace-${imageId}`);
    try {
      const res = await replaceProductImageAction(formData);
      if (res.success && res.data) {
        setImages((prev) =>
          prev.map((img) => (img.id === imageId ? { ...img, storage_path: res.data!.storage_path } : img))
        );
        setReplacingImageId(null);
        showFeedback("success", "Image replaced successfully.");
        onRefresh?.();
      } else {
        showFeedback("error", res.message);
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to replace image.");
    } finally {
      setLoadingAction(null);
      // Reset input
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Feedback Alert */}
      {feedback && (
        <div
          role="alert"
          className={`p-3 text-xs flex items-center gap-2 border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Gallery Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs uppercase font-mono tracking-luxury text-vantaire-champagne">
            Image Gallery ({images.length} / 5)
          </h3>
          <p className="text-[11px] text-vantaire-muted">
            Drag or use arrows to reorder. Active products must have exactly one primary image.
          </p>
        </div>
        {loadingAction === "reorder" && (
          <span className="text-[11px] font-mono text-vantaire-champagne animate-pulse">
            Saving order...
          </span>
        )}
      </div>

      {/* Empty State */}
      {images.length === 0 ? (
        <div className="p-8 border border-dashed border-vantaire-border text-center space-y-2 bg-vantaire-charcoal/20">
          <p className="text-xs text-vantaire-muted font-mono">
            No media assets cataloged for this product.
          </p>
          <p className="text-[11px] text-vantaire-muted">
            Upload an image below to establish this product&apos;s presentation.
          </p>
        </div>
      ) : (
        /* Image Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {images.map((img, idx) => {
            const publicUrl = buildPublicStorageUrl(img.storage_path);
            const isFirst = idx === 0;
            const isLast = idx === images.length - 1;
            const isBusy = loadingAction?.includes(img.id);

            return (
              <div
                key={img.id}
                className={`relative group bg-vantaire-charcoal/40 border transition-all ${
                  img.is_primary
                    ? "border-vantaire-champagne/80 shadow-[0_0_12px_rgba(201,169,110,0.15)]"
                    : "border-vantaire-border hover:border-vantaire-border/80"
                }`}
              >
                {/* Image Preview Container */}
                <div className="relative aspect-[4/5] bg-vantaire-black overflow-hidden">
                  <Image
                    src={publicUrl}
                    alt={img.alt_text || productName}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover"
                  />

                  {/* Primary Badge */}
                  {img.is_primary && (
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-vantaire-black/90 text-vantaire-champagne px-2 py-0.5 text-[9px] font-mono tracking-wider border border-vantaire-champagne/50 shadow-sm">
                      <Star className="w-2.5 h-2.5 fill-vantaire-champagne" />
                      PRIMARY
                    </div>
                  )}

                  {/* Order Index Badge */}
                  <div className="absolute top-2 right-2 z-10 bg-vantaire-black/80 text-vantaire-sand px-1.5 py-0.5 text-[9px] font-mono border border-vantaire-border">
                    #{idx + 1}
                  </div>

                  {/* Quick Action Overlay */}
                  <div className="absolute inset-0 bg-vantaire-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                    {/* Reorder Arrows */}
                    <div className="flex justify-between">
                      <button
                        type="button"
                        disabled={isFirst || Boolean(loadingAction)}
                        onClick={() => handleMove(idx, "left")}
                        title="Move left / up"
                        className="p-1 bg-vantaire-charcoal text-vantaire-sand hover:text-vantaire-champagne disabled:opacity-30 border border-vantaire-border"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast || Boolean(loadingAction)}
                        onClick={() => handleMove(idx, "right")}
                        title="Move right / down"
                        className="p-1 bg-vantaire-charcoal text-vantaire-sand hover:text-vantaire-champagne disabled:opacity-30 border border-vantaire-border"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Middle Controls */}
                    <div className="space-y-1 text-center">
                      {!img.is_primary && (
                        <button
                          type="button"
                          disabled={Boolean(loadingAction)}
                          onClick={() => handleSetPrimary(img.id)}
                          className="w-full py-1 text-[10px] font-mono uppercase tracking-wider bg-vantaire-champagne text-vantaire-black hover:bg-vantaire-champagne/90 transition"
                        >
                          Make Primary
                        </button>
                      )}

                      {/* Replace File Trigger */}
                      <label className="block w-full py-1 text-[10px] font-mono uppercase tracking-wider bg-vantaire-charcoal text-vantaire-warmWhite hover:text-vantaire-champagne border border-vantaire-border cursor-pointer transition">
                        Replace File
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          className="hidden"
                          onChange={(e) => handleFileReplace(img.id, e)}
                        />
                      </label>
                    </div>

                    {/* Bottom Controls */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={isBusy || (isActive && images.length <= 1)}
                        onClick={() => handleRemove(img.id, img.is_primary)}
                        title={
                          isActive && images.length <= 1
                            ? "Cannot remove only image of active product"
                            : "Remove image"
                        }
                        className="p-1 bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 disabled:opacity-30 border border-rose-500/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-2.5 space-y-1.5 bg-vantaire-charcoal/60 text-[10px]">
                  {/* Storage Path Copy */}
                  <div className="flex items-center justify-between text-vantaire-muted font-mono">
                    <span className="truncate max-w-[130px]" title={img.storage_path}>
                      {img.storage_path.split("/").pop()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(img.storage_path)}
                      title="Copy storage path"
                      className="text-vantaire-muted hover:text-vantaire-champagne p-0.5"
                    >
                      {copiedPath === img.storage_path ? (
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-2.5 h-2.5" />
                      )}
                    </button>
                  </div>

                  {/* Alt Text inline editor */}
                  {editingAltId === img.id ? (
                    <div className="space-y-1 pt-1 border-t border-vantaire-border">
                      <input
                        type="text"
                        value={altDraft}
                        onChange={(e) => setAltDraft(e.target.value)}
                        className="w-full px-1.5 py-0.5 text-[10px] bg-vantaire-black border border-vantaire-champagne text-vantaire-warmWhite focus:outline-none"
                        placeholder="Accessibility alt text..."
                        maxLength={200}
                      />
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingAltId(null)}
                          className="px-1.5 py-0.5 text-[9px] text-vantaire-muted hover:text-vantaire-warmWhite"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(loadingAction)}
                          onClick={() => handleSaveAlt(img.id)}
                          className="px-1.5 py-0.5 text-[9px] bg-vantaire-champagne text-vantaire-black"
                        >
                          <Check className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-1 text-vantaire-sand/80 pt-1 border-t border-vantaire-border/60">
                      <p className="line-clamp-2 italic" title={img.alt_text}>
                        &ldquo;{img.alt_text}&rdquo;
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAltId(img.id);
                          setAltDraft(img.alt_text);
                        }}
                        title="Edit alt text"
                        className="text-vantaire-muted hover:text-vantaire-champagne p-0.5 shrink-0"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
