"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { UploadCloud, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import { uploadProductImageAction } from "@/lib/admin/media-actions";
import { MAX_IMAGE_FILE_SIZE } from "@/lib/admin/media-validation";

interface MediaUploaderProps {
  productId: string;
  productSlug: string;
  currentImageCount: number;
  onUploadSuccess?: () => void;
}

export function MediaUploader({
  productId,
  currentImageCount,
  onUploadSuccess,
}: MediaUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [isPrimary, setIsPrimary] = useState(currentImageCount === 0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMaxReached = currentImageCount >= 5;

  const handleFileChange = (selected: File | null) => {
    setError(null);
    setSuccess(null);

    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (selected.size > MAX_IMAGE_FILE_SIZE) {
      setError(
        `Selected file is ${(selected.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 5 MB.`
      );
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(selected.type.toLowerCase())) {
      setError("Only JPEG, PNG, and WebP image formats are permitted.");
      return;
    }

    setFile(selected);
    const objectUrl = URL.createObjectURL(selected);
    setPreviewUrl(objectUrl);
  };

  const handleClear = () => {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setAltText("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an image file to upload.");
      return;
    }

    if (!altText.trim() || altText.trim().length < 2) {
      setError("Please provide a descriptive alt text (min 2 characters).");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("file", file);
    formData.append("altText", altText.trim());
    formData.append("isPrimary", isPrimary ? "true" : "false");

    try {
      const res = await uploadProductImageAction(formData);
      if (res.success) {
        setSuccess("Image uploaded and cataloged successfully.");
        handleClear();
        onUploadSuccess?.();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-5 bg-vantaire-charcoal/40 border border-vantaire-border/80 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs uppercase font-mono tracking-luxury text-vantaire-champagne">
            Upload Product Asset
          </h3>
          <p className="text-[11px] text-vantaire-muted">
            Max 5 MB • Content-addressed SHA-256 • JPEG, PNG, WebP
          </p>
        </div>
        <div className="text-[11px] font-mono text-vantaire-sand">
          Capacity:{" "}
          <span className={isMaxReached ? "text-amber-400 font-semibold" : "text-emerald-400"}>
            {currentImageCount}/5
          </span>
        </div>
      </div>

      {isMaxReached ? (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            This product has reached the limit of 5 catalog images. To upload a new photo, remove or replace an existing image above.
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Dropzone / Preview */}
          {!previewUrl ? (
            <label
              htmlFor="media-file-input"
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-vantaire-border hover:border-vantaire-champagne/60 bg-vantaire-black/40 cursor-pointer transition"
            >
              <UploadCloud className="w-8 h-8 text-vantaire-muted mb-2" />
              <p className="text-xs text-vantaire-warmWhite font-mono">
                Click to select or drop an image file here
              </p>
              <p className="text-[10px] text-vantaire-muted mt-1">
                Accepted: JPG, PNG, WEBP (Maximum size: 5 MB)
              </p>
              <input
                id="media-file-input"
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                disabled={isUploading}
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
            </label>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-vantaire-black/60 border border-vantaire-border">
              <div className="relative w-24 h-24 bg-vantaire-charcoal shrink-0 border border-vantaire-border overflow-hidden">
                <Image
                  src={previewUrl}
                  alt="Upload preview"
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
              <div className="flex-1 space-y-1 text-xs">
                <p className="font-mono text-vantaire-warmWhite truncate max-w-sm">
                  {file?.name}
                </p>
                <p className="text-[10px] font-mono text-vantaire-muted">
                  Size: {file ? (file.size / 1024).toFixed(1) : 0} KB • Type: {file?.type}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClear}
                disabled={isUploading}
                className="p-1 text-vantaire-muted hover:text-rose-400 transition"
                title="Discard file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Alt Text & Primary Flag */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label
                htmlFor="alt-text-input"
                className="text-[10px] uppercase font-mono tracking-luxury text-vantaire-champagne flex items-center justify-between"
              >
                <span>Descriptive Alt Text (Required)</span>
                <span className="text-vantaire-muted">{altText.length}/200</span>
              </label>
              <input
                id="alt-text-input"
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="e.g. Front angled presentation of Noir Sovereign Aviator with charcoal polarized lenses"
                maxLength={200}
                disabled={isUploading}
                className="w-full px-3 py-2 bg-vantaire-black border border-vantaire-border text-xs text-vantaire-warmWhite placeholder:text-vantaire-muted/60 focus:border-vantaire-champagne focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-vantaire-warmWhite">
                <input
                  type="checkbox"
                  checked={isPrimary || currentImageCount === 0}
                  disabled={isUploading || currentImageCount === 0}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded border-vantaire-border bg-vantaire-black text-vantaire-champagne focus:ring-0 w-3.5 h-3.5"
                />
                <span className="font-mono text-[11px]">
                  {currentImageCount === 0 ? "Default Primary (Initial)" : "Set as Primary Image"}
                </span>
              </label>

              <button
                type="submit"
                disabled={isUploading || !file}
                className="w-full py-2 bg-vantaire-champagne text-vantaire-black font-mono text-xs uppercase tracking-luxury font-semibold hover:bg-vantaire-champagne/90 disabled:opacity-40 transition flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Upload Image</span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
