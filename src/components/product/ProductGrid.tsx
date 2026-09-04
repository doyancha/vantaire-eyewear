import { Product } from "@/types/catalog";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  priorityCount?: number;
}

export function ProductGrid({ products, priorityCount = 2 }: ProductGridProps) {
  if (!products || products.length === 0) {
    return (
      <div className="py-20 text-center border border-dashed border-vantaire-border/80 p-8 max-w-lg mx-auto">
        <p className="font-serif text-xl text-vantaire-warmWhite">No sunglasses found</p>
        <p className="text-xs text-vantaire-muted mt-2">
          Try clearing your filter or browse our complete collection of handcrafted eyewear.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}
