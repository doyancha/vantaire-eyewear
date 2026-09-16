"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Info, ShieldCheck } from "lucide-react";
import {
  createCollectionAction,
} from "@/lib/admin/collection-actions";
import { slugifyCollectionName } from "@/lib/admin/collection-validation";

export function CollectionCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugTouched) {
      setSlug(slugifyCollectionName(val));
    }
  };

  const handleSlugChange = (val: string) => {
    setSlugTouched(true);
    setSlug(val.toLowerCase().replace(/\s+/g, "-"));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGlobalError(null);

    startTransition(async () => {
      const res = await createCollectionAction({
        name,
        slug,
        tagline,
        description,
      });

      if (res.success && res.data) {
        router.push(`/admin/collections/${res.data.id}/edit`);
      } else {
        if (res.errors) {
          setErrors(res.errors);
        }
        setGlobalError(res.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Informational Guidance Banner */}
      <div className="flex items-start gap-3 p-4 bg-vantaire-charcoal/50 border border-vantaire-champagne/30 text-xs text-vantaire-sand/90">
        <Info className="w-4 h-4 text-vantaire-champagne shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-vantaire-champagne uppercase tracking-wider text-[11px]">
            Draft Architecture Lifecycle
          </p>
          <p>
            All new collections are created in an <strong className="text-vantaire-warmWhite">Inactive Draft</strong> status. After creation, you will upload a high-resolution cover image and assign catalog products before publication to the storefront.
          </p>
        </div>
      </div>

      {globalError && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-800/80 text-red-200 text-xs rounded"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">{globalError}</div>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="p-6 bg-vantaire-charcoal/30 border border-vantaire-border/80 space-y-5">
        <h2 className="text-xs uppercase tracking-luxury text-vantaire-champagne font-semibold border-b border-vantaire-border/60 pb-2">
          Collection Essentials
        </h2>

        {/* Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="collection-name"
            className="block text-xs font-mono uppercase tracking-wider text-vantaire-sand"
          >
            Collection Name <span className="text-vantaire-champagne">*</span>
          </label>
          <input
            id="collection-name"
            type="text"
            required
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. The Verona Cat-Eye"
            className="w-full px-3.5 py-2.5 bg-vantaire-charcoal/60 border border-vantaire-border/80 text-xs text-vantaire-warmWhite placeholder:text-vantaire-muted focus:outline-none focus:border-vantaire-champagne"
          />
          {errors.name && (
            <p className="text-[11px] text-red-400 font-mono mt-1">{errors.name[0]}</p>
          )}
        </div>

        {/* Slug */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="collection-slug"
              className="block text-xs font-mono uppercase tracking-wider text-vantaire-sand"
            >
              Public Route Slug <span className="text-vantaire-champagne">*</span>
            </label>
            <span className="text-[10px] font-mono text-vantaire-champagne flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Locked permanently upon creation
            </span>
          </div>
          <div className="flex items-center">
            <span className="px-3 py-2.5 bg-vantaire-black/60 border border-r-0 border-vantaire-border/80 text-xs font-mono text-vantaire-muted select-none">
              /collections/
            </span>
            <input
              id="collection-slug"
              type="text"
              required
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="the-verona-cat-eye"
              className="flex-1 px-3.5 py-2.5 bg-vantaire-charcoal/60 border border-vantaire-border/80 text-xs font-mono text-vantaire-warmWhite placeholder:text-vantaire-muted focus:outline-none focus:border-vantaire-champagne"
            />
          </div>
          <p className="text-[10px] text-vantaire-muted">
            Lowercase alphanumeric with hyphens only. Permanent public URL identifier.
          </p>
          {errors.slug && (
            <p className="text-[11px] text-red-400 font-mono mt-1">{errors.slug[0]}</p>
          )}
        </div>

        {/* Tagline */}
        <div className="space-y-1.5">
          <label
            htmlFor="collection-tagline"
            className="block text-xs font-mono uppercase tracking-wider text-vantaire-sand"
          >
            Tagline <span className="text-vantaire-champagne">*</span>
          </label>
          <input
            id="collection-tagline"
            type="text"
            required
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g. High-Attitude Contours"
            className="w-full px-3.5 py-2.5 bg-vantaire-charcoal/60 border border-vantaire-border/80 text-xs text-vantaire-warmWhite placeholder:text-vantaire-muted focus:outline-none focus:border-vantaire-champagne"
          />
          {errors.tagline && (
            <p className="text-[11px] text-red-400 font-mono mt-1">{errors.tagline[0]}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label
            htmlFor="collection-desc"
            className="block text-xs font-mono uppercase tracking-wider text-vantaire-sand"
          >
            Description <span className="text-vantaire-champagne">*</span>
          </label>
          <textarea
            id="collection-desc"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide a detailed editorial overview of the collection's design philosophy and silhouette characteristics..."
            className="w-full px-3.5 py-2.5 bg-vantaire-charcoal/60 border border-vantaire-border/80 text-xs text-vantaire-warmWhite placeholder:text-vantaire-muted focus:outline-none focus:border-vantaire-champagne"
          />
          {errors.description && (
            <p className="text-[11px] text-red-400 font-mono mt-1">{errors.description[0]}</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/admin/collections"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-vantaire-border/80 text-xs font-mono text-vantaire-sand hover:text-vantaire-warmWhite hover:bg-vantaire-charcoal/60 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-vantaire-champagne text-vantaire-black hover:bg-vantaire-champagne/90 text-xs font-semibold tracking-luxury uppercase transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Draft...</span>
            </>
          ) : (
            <span>Create Collection Draft</span>
          )}
        </button>
      </div>
    </form>
  );
}
