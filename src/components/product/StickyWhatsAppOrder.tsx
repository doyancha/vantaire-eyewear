"use client";

import { Product } from "@/types/catalog";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { buildProductWhatsAppUrl } from "@/lib/whatsapp";

import type { OperationalSettings } from "@/lib/data/mappers";

interface StickyWhatsAppOrderProps {
  product: Product;
  settings?: Partial<OperationalSettings>;
}

export function StickyWhatsAppOrder({ product, settings }: StickyWhatsAppOrderProps) {
  const whatsappUrl = buildProductWhatsAppUrl(product, { settings });

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-vantaire-black/95 backdrop-blur-md border-t border-vantaire-border/80 px-4 py-3 shadow-2xl">
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-serif font-medium text-vantaire-warmWhite truncate">
            {product.name}
          </p>
          <p className="text-xs font-semibold text-vantaire-champagne">
            {product.currencySymbol}{product.price.toLocaleString()}
          </p>
        </div>

        <WhatsAppButton
          href={whatsappUrl}
          size="sm"
          variant="primary"
          className="flex-shrink-0 text-xs px-4 py-2.5 whitespace-nowrap"
        >
          Order on WhatsApp
        </WhatsAppButton>
      </div>
    </div>
  );
}
