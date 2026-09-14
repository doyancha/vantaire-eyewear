"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, RefreshCw, ShoppingBag, Eye, Layers } from "lucide-react";

export function QuickActions() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="p-4 bg-vantaire-charcoal/40 border border-vantaire-border/80 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-luxury text-vantaire-champagne font-semibold mr-1">
          Quick Actions:
        </span>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-vantaire-sand hover:text-vantaire-warmWhite bg-vantaire-black/40 border border-vantaire-border/60 hover:border-vantaire-champagne/40 transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-vantaire-champagne" aria-hidden="true" />
          <span>Home Storefront</span>
        </Link>

        <Link
          href="/shop"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-vantaire-sand hover:text-vantaire-warmWhite bg-vantaire-black/40 border border-vantaire-border/60 hover:border-vantaire-champagne/40 transition-colors"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-vantaire-champagne" aria-hidden="true" />
          <span>Shop Catalog</span>
        </Link>

        <Link
          href="/collections"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-vantaire-sand hover:text-vantaire-warmWhite bg-vantaire-black/40 border border-vantaire-border/60 hover:border-vantaire-champagne/40 transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-vantaire-champagne" aria-hidden="true" />
          <span>Collections</span>
        </Link>
      </div>

      <div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-vantaire-sand hover:text-vantaire-warmWhite bg-vantaire-black/60 border border-vantaire-border/80 hover:border-vantaire-champagne/60 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isPending ? "animate-spin text-vantaire-champagne" : ""}`}
            aria-hidden="true"
          />
          <span>{isPending ? "Refreshing..." : "Refresh Dashboard"}</span>
        </button>
      </div>
    </div>
  );
}
