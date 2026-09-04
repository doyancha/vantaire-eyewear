import { Product } from "@/types/catalog";
import { siteConfig } from "./config";

/**
 * Builds a direct, pre-filled WhatsApp ordering link for a specific product.
 */
export function buildProductWhatsAppUrl(
  product: Product,
  sourceUrl?: string
): string {
  const urlToShare = sourceUrl || `${siteConfig.siteUrl}/products/${product.slug}`;
  
  const message = [
    `Hello ${siteConfig.brandName},`,
    ``,
    `I would like to order / check availability for:`,
    ``,
    `• Product: ${product.name}`,
    `• Price: ${product.currencySymbol}${product.price.toLocaleString()}`,
    `• Frame: ${product.frameColor} (${product.frameMaterial})`,
    `• Lens: ${product.lensColor} (${product.lensType})`,
    `• Product URL: ${urlToShare}`,
    ``,
    `Please confirm availability, delivery and ordering details.`,
    ``,
    `Thank you.`
  ].join("\n");

  const cleanNumber = siteConfig.whatsapp.number.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Builds a general concierge inquiry link.
 */
export function buildGeneralWhatsAppUrl(customMessage?: string): string {
  const msg = customMessage || siteConfig.whatsapp.defaultGreeting;
  const cleanNumber = siteConfig.whatsapp.number.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
}