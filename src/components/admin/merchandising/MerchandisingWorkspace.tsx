"use client";

import { useState } from "react";
import { Sparkles, LayoutList, Layers } from "lucide-react";
import { HomepageCurationPreview } from "./HomepageCurationPreview";
import { ProductMerchandisingTable } from "./ProductMerchandisingTable";
import { CollectionOrderingList } from "./CollectionOrderingList";
import { AdminProductMerchandisingRow, AdminCollectionOrderingRow } from "./types";

interface MerchandisingWorkspaceProps {
  products: AdminProductMerchandisingRow[];
  collections: AdminCollectionOrderingRow[];
}

type MerchandisingTab = "curation" | "products" | "collections";

export function MerchandisingWorkspace({
  products,
  collections,
}: MerchandisingWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<MerchandisingTab>("curation");

  return (
    <div className="space-y-6">
      {/* Workspace Navigation Tabs */}
      <div className="flex border-b border-vantaire-border/40 gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("curation")}
          className={`px-4 py-2.5 text-xs font-mono uppercase tracking-luxury transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "curation"
              ? "border-vantaire-champagne text-vantaire-champagne font-medium"
              : "border-transparent text-vantaire-muted hover:text-vantaire-warmWhite hover:border-vantaire-border/60"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Homepage Curation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2.5 text-xs font-mono uppercase tracking-luxury transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "products"
              ? "border-vantaire-champagne text-vantaire-champagne font-medium"
              : "border-transparent text-vantaire-muted hover:text-vantaire-warmWhite hover:border-vantaire-border/60"
          }`}
        >
          <LayoutList className="w-3.5 h-3.5" />
          <span>Product Ordering & Flags ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("collections")}
          className={`px-4 py-2.5 text-xs font-mono uppercase tracking-luxury transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === "collections"
              ? "border-vantaire-champagne text-vantaire-champagne font-medium"
              : "border-transparent text-vantaire-muted hover:text-vantaire-warmWhite hover:border-vantaire-border/60"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Collection Ordering ({collections.length})</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "curation" && (
        <HomepageCurationPreview products={products} collections={collections} />
      )}

      {activeTab === "products" && (
        <ProductMerchandisingTable initialProducts={products} />
      )}

      {activeTab === "collections" && (
        <CollectionOrderingList initialCollections={collections} />
      )}
    </div>
  );
}
