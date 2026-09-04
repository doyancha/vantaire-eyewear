import { Product } from "@/types/catalog";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { buildProductWhatsAppUrl } from "@/lib/whatsapp";
import { siteConfig } from "@/lib/config";
import { ShieldCheck, Truck, Sparkles, RefreshCw } from "lucide-react";

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const whatsappUrl = buildProductWhatsAppUrl(product);

  return (
    <div className="space-y-6">
      {/* Category & Badges */}
      <div className="flex flex-wrap items-center gap-2">
        {product.badge && (
          <span className="px-2.5 py-1 text-[9px] uppercase tracking-luxury font-semibold bg-vantaire-black border border-vantaire-champagne/40 text-vantaire-champagne">
            {product.badge}
          </span>
        )}
        <span className="text-[10px] uppercase tracking-luxury text-vantaire-muted">
          {product.frameShape} • {product.gender}
        </span>
        {product.polarized && (
          <span className="px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            Polarized Optics
          </span>
        )}
      </div>

      {/* Product Title */}
      <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-vantaire-warmWhite tracking-tight">
        {product.name}
      </h1>

      {/* Pricing Bar */}
      <div className="flex items-baseline gap-3 pb-2 border-b border-vantaire-border/60">
        <span className="text-2xl sm:text-3xl font-medium text-vantaire-warmWhite">
          {product.currencySymbol}{product.price.toLocaleString()}
        </span>
        {product.compareAtPrice && (
          <span className="text-sm text-vantaire-muted line-through">
            {product.currencySymbol}{product.compareAtPrice.toLocaleString()}
          </span>
        )}
        <span className="text-xs text-amber-400 font-medium ml-auto">
          ● Demo Catalog Item (Inquire Availability)
        </span>
      </div>

      {/* Short Description */}
      <p className="text-sm text-vantaire-sand/90 font-sans leading-relaxed">
        {product.description}
      </p>

      {/* Primary WhatsApp Ordering Box */}
      <div className="bg-vantaire-charcoal/60 border border-vantaire-border p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-luxury font-semibold text-vantaire-warmWhite flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Direct WhatsApp Purchase
          </p>
          <p className="text-xs text-vantaire-muted">
            Click below to generate a pre-filled message with this frame’s specifications directly to our official concierge.
          </p>
        </div>

        <WhatsAppButton
          href={whatsappUrl}
          size="lg"
          variant="primary"
          className="w-full text-xs sm:text-sm py-4 shadow-xl"
        >
          Order This Frame on WhatsApp
        </WhatsAppButton>

        <p className="text-[11px] text-vantaire-muted text-center">
          Payment via Cash on Delivery • Estimated {siteConfig.delivery.insideDhakaTime} in Dhaka
        </p>
      </div>

      {/* Key Architectural Specifications */}
      <div className="pt-2 space-y-3">
        <h3 className="text-xs uppercase tracking-luxury font-semibold text-vantaire-warmWhite">
          Frame Architecture
        </h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-y border-vantaire-border/60 py-4">
          <div>
            <dt className="text-vantaire-muted uppercase text-[10px] tracking-wider">Frame Material</dt>
            <dd className="text-vantaire-sand font-medium mt-0.5">{product.frameMaterial}</dd>
          </div>
          <div>
            <dt className="text-vantaire-muted uppercase text-[10px] tracking-wider">Frame Color</dt>
            <dd className="text-vantaire-sand font-medium mt-0.5">{product.frameColor}</dd>
          </div>
          <div>
            <dt className="text-vantaire-muted uppercase text-[10px] tracking-wider">Lens Type</dt>
            <dd className="text-vantaire-sand font-medium mt-0.5">{product.lensType}</dd>
          </div>
          <div>
            <dt className="text-vantaire-muted uppercase text-[10px] tracking-wider">Lens Color</dt>
            <dd className="text-vantaire-sand font-medium mt-0.5">{product.lensColor}</dd>
          </div>
          <div>
            <dt className="text-vantaire-muted uppercase text-[10px] tracking-wider">UV Protection</dt>
            <dd className="text-vantaire-sand font-medium mt-0.5">{product.uvProtection}</dd>
          </div>
          <div>
            <dt className="text-vantaire-muted uppercase text-[10px] tracking-wider">Dimensions (Lens-Bridge-Temple)</dt>
            <dd className="text-vantaire-sand font-medium mt-0.5">
              {product.dimensions.lensWidth}mm – {product.dimensions.bridgeWidth}mm – {product.dimensions.templeLength}mm
            </dd>
          </div>
        </dl>
      </div>

      {/* Packaging & Inclusions */}
      <div className="space-y-2 text-xs text-vantaire-muted">
        <p className="text-vantaire-warmWhite font-semibold uppercase tracking-luxury text-[10px]">
          In the signature package:
        </p>
        <p className="leading-relaxed">
          {siteConfig.delivery.packaging}
        </p>
      </div>

      {/* Trust Highlights */}
      <div className="pt-4 border-t border-vantaire-border/60 grid grid-cols-2 gap-4 text-xs">
        <div className="flex items-center gap-2.5 text-vantaire-sand">
          <Truck className="w-4 h-4 text-vantaire-champagne flex-shrink-0" />
          <span>Inside Dhaka: ৳{siteConfig.delivery.feeInsideDhaka} ({siteConfig.delivery.insideDhakaTime})</span>
        </div>
        <div className="flex items-center gap-2.5 text-vantaire-sand">
          <ShieldCheck className="w-4 h-4 text-vantaire-champagne flex-shrink-0" />
          <span>Optical Glare Shield</span>
        </div>
        <div className="flex items-center gap-2.5 text-vantaire-sand">
          <Sparkles className="w-4 h-4 text-vantaire-champagne flex-shrink-0" />
          <span>Acetate & Alloy Finish</span>
        </div>
        <div className="flex items-center gap-2.5 text-vantaire-sand">
          <RefreshCw className="w-4 h-4 text-vantaire-champagne flex-shrink-0" />
          <span>Fit Exchange Policy</span>
        </div>
      </div>
    </div>
  );
}