"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ExternalLink } from "lucide-react";

interface AdminErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminDashboardError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    // Log safe diagnostic details internally
    console.error("Admin dashboard runtime error:", error);
  }, [error]);

  return (
    <div className="py-16 max-w-lg mx-auto text-center space-y-6">
      <div className="w-12 h-12 mx-auto bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
        <AlertCircle className="w-6 h-6" aria-hidden="true" />
      </div>

      <div className="space-y-2">
        <h1 className="font-serif text-2xl text-vantaire-warmWhite">
          Admin Data Unavailable
        </h1>
        <p className="text-xs text-vantaire-sand/80 leading-relaxed font-sans">
          The administrative data layer could not be loaded from the database at this time.
          Ensure the local database engine is running and active.
        </p>
      </div>

      <div className="flex items-center justify-center gap-4 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-luxury font-medium bg-vantaire-champagne text-vantaire-black hover:bg-vantaire-champagne/90 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Retry</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-luxury font-medium bg-vantaire-charcoal text-vantaire-sand border border-vantaire-border hover:text-vantaire-warmWhite transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Return to Storefront</span>
        </Link>
      </div>
    </div>
  );
}
