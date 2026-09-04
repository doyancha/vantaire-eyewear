"use client";

import { useState, useMemo } from "react";
import { getAllProducts } from "@/lib/products";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FrameShape, LensType } from "@/types/catalog";
import { Filter, SlidersHorizontal, Check } from "lucide-react";

export default function ShopPage() {
  const allProducts = getAllProducts();
  const [selectedShape, setSelectedShape] = useState<string>("All");
  const [selectedLens, setSelectedLens] = useState<string>("All");
  const [onlyPolarized, setOnlyPolarized] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("featured");

  const shapes: string[] = ["All", "Aviator", "Square", "Round", "Cat-Eye", "Geometric", "Sport", "Oversized"];
  const lenses: string[] = ["All", "Polarized", "Gradient", "Solid UV400", "Mirrored"];

  const filteredProducts = useMemo(() => {
    return allProducts
      .filter((p) => {
        if (selectedShape !== "All" && p.frameShape !== selectedShape) return false;
        if (selectedLens !== "All" && p.lensType !== selectedLens) return false;
        if (onlyPolarized && !p.polarized) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-low") return a.price - b.price;
        if (sortBy === "price-high") return b.price - a.price;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return 0; // default featured order
      });
  }, [allProducts, selectedShape, selectedLens, onlyPolarized, sortBy]);

  return (
    <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Page Heading */}
      <SectionHeading
        eyebrow="The Full Architecture"
        title="Complete Sunglasses Edit"
        subtitle="Explore our complete line of architectural frames engineered for presence and clarity. Order any model directly via WhatsApp."
      />

      {/* Filter and Control Bar */}
      <div className="bg-vantaire-charcoal/50 border border-vantaire-border/80 p-5 mb-10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Shapes / Silhouettes Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-luxury text-vantaire-muted mr-2 flex items-center gap-1">
              <Filter className="w-3 h-3 text-vantaire-champagne" /> Shape:
            </span>
            {shapes.map((shape) => (
              <button
                key={shape}
                type="button"
                onClick={() => setSelectedShape(shape)}
                className={`px-3 py-1.5 text-xs font-sans transition-colors ${
                  selectedShape === shape
                    ? "bg-vantaire-warmWhite text-vantaire-black font-semibold"
                    : "bg-vantaire-black/60 text-vantaire-sand hover:text-vantaire-warmWhite border border-vantaire-border/60"
                }`}
              >
                {shape}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <SlidersHorizontal className="w-3.5 h-3.5 text-vantaire-muted" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-vantaire-black border border-vantaire-border text-vantaire-sand text-xs py-1.5 px-3 focus:border-vantaire-champagne focus:outline-none"
              aria-label="Sort products"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* Secondary Lens & Polarized Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-vantaire-border/40 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-luxury text-vantaire-muted mr-1">
              Optics:
            </span>
            {lenses.map((lens) => (
              <button
                key={lens}
                type="button"
                onClick={() => setSelectedLens(lens)}
                className={`px-2.5 py-1 text-[11px] transition-colors ${
                  selectedLens === lens
                    ? "text-vantaire-champagne underline underline-offset-4"
                    : "text-vantaire-muted hover:text-vantaire-sand"
                }`}
              >
                {lens}
              </button>
            ))}
          </div>

          {/* Polarized quick checkbox */}
          <button
            type="button"
            onClick={() => setOnlyPolarized(!onlyPolarized)}
            className={`flex items-center gap-2 px-3 py-1 text-xs border transition-colors ${
              onlyPolarized
                ? "border-emerald-500 bg-emerald-950/40 text-emerald-300"
                : "border-vantaire-border text-vantaire-muted hover:text-vantaire-sand"
            }`}
          >
            <span className={`w-3.5 h-3.5 border flex items-center justify-center ${
              onlyPolarized ? "border-emerald-400 bg-emerald-500" : "border-vantaire-border"
            }`}>
              {onlyPolarized && <Check className="w-3 h-3 text-black stroke-[3]" />}
            </span>
            <span>Polarized Only</span>
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6 flex items-center justify-between text-xs text-vantaire-muted">
        <span>Showing {filteredProducts.length} handcrafted models</span>
        {(selectedShape !== "All" || selectedLens !== "All" || onlyPolarized) && (
          <button
            type="button"
            onClick={() => {
              setSelectedShape("All");
              setSelectedLens("All");
              setOnlyPolarized(false);
            }}
            className="text-vantaire-champagne hover:underline"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Main Grid */}
      <ProductGrid products={filteredProducts} priorityCount={3} />
    </div>
  );
}