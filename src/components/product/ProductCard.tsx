"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "@/types/catalog";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { buildProductWhatsAppUrl } from "@/lib/whatsapp";
import { ArrowRight } from "lucide-react";

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const whatsappUrl = buildProductWhatsAppUrl(product);

  return (
    <div className="group relative flex flex-col bg-vantaire-charcoal/40 border border-vantaire-border/60 hover:border-vantaire-champagne/50 transition-all duration-300">
      {/* Product Image Area */}
      <div className="relative aspect-[4/3] sm:aspect-square w-full bg-vantaire-charcoal overflow-hidden">
        {/* Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
          {product.badge && (
            <span className="px-2.5 py-1 text-[9px] uppercase tracking-luxury font-semibold bg-vantaire-black/85 backdrop-blur-md text-vantaire-champagne border border-vantaire-champagne/30">
              {product.badge}
            </span>
          )}
        </div>

        {/* Clickable Image to Product Detail */}
        <Link href={`/products/${product.slug}`} className="block w-full h-full relative" tabIndex={-1} aria-label={`View details of ${product.name}`}>
          <Image
            src={product.images[0] || "/images/fallback-sunglasses.jpg"}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (target.src !== "/images/fallback-sunglasses.jpg") {
                target.src = "/images/fallback-sunglasses.jpg";
              }
            }}
          />
        </Link>
      </div>

      {/* Product Metadata & Actions */}
      <div className="p-5 flex flex-col flex-1 justify-between gap-4">
        <div>
          <div className="flex items-center justify-between text-[10px] uppercase tracking-luxury text-vantaire-muted mb-1">
            <span>{product.frameShape} • {product.frameLook}</span>
            <span className="text-amber-400 font-medium">Demo Catalog</span>
          </div>

          <h3 className="font-serif text-lg font-normal text-vantaire-warmWhite group-hover:text-vantaire-champagne transition-colors">
            <Link href={`/products/${product.slug}`}>
              {product.name}
            </Link>
          </h3>

          <p className="text-xs text-vantaire-muted line-clamp-1 mt-1 font-sans">
            {product.shortDescription}
          </p>

          <div className="mt-3 flex items-baseline gap-2.5">
            <span className="text-base font-medium text-vantaire-warmWhite">
              {product.currencySymbol}{product.price.toLocaleString()}
            </span>
            {product.compareAtPrice && (
              <span className="text-xs text-vantaire-muted line-through">
                {product.currencySymbol}{product.compareAtPrice.toLocaleString()}
              </span>
            )}
            <span className="text-[10px] text-vantaire-champagne/90 ml-auto uppercase tracking-wider">
              {product.fit} Fit
            </span>
          </div>
        </div>

        {/* Direct Action Affordances */}
        <div className="pt-2 border-t border-vantaire-border/40 grid grid-cols-2 gap-2">
          <Link
            href={`/products/${product.slug}`}
            className="inline-flex items-center justify-center gap-1 text-[11px] uppercase tracking-wider text-vantaire-sand hover:text-vantaire-warmWhite border border-vantaire-border hover:border-vantaire-sand py-2.5 px-2 transition-colors"
          >
            <span>Specs</span>
            <ArrowRight className="w-3 h-3" />
          </Link>

          <WhatsAppButton
            href={whatsappUrl}
            size="sm"
            variant="compact"
            className="w-full text-[11px] py-2.5"
          >
            Order
          </WhatsAppButton>
        </div>
      </div>
    </div>
  );
}