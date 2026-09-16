import { Product } from "@/types/catalog";
import { siteConfig } from "./config";
import type { OperationalSettings } from "./data/mappers";

export interface WhatsAppUrlOptions {
  sourceUrl?: string;
  settings?: Partial<OperationalSettings>;
}

/**
 * Builds a direct, pre-filled WhatsApp ordering link for a specific product.
 * Sends only verifiable merchandising attributes and requests final specs confirmation.
 * Accepts optional options containing live settings or custom sourceUrl.
 */
export function buildProductWhatsAppUrl(
  product: Product,
  sourceUrlOrOptions?: string | WhatsAppUrlOptions,
  legacySourceUrl?: string
): string {
  let sourceUrl: string | undefined;
  let settings: Partial<OperationalSettings> | undefined;

  if (typeof sourceUrlOrOptions === "string") {
    sourceUrl = sourceUrlOrOptions;
  } else if (sourceUrlOrOptions && typeof sourceUrlOrOptions === "object") {
    sourceUrl = sourceUrlOrOptions.sourceUrl;
    settings = sourceUrlOrOptions.settings;
  }

  if (!sourceUrl && legacySourceUrl) {
    sourceUrl = legacySourceUrl;
  }

  const brandName = settings?.brandName || siteConfig.brandName;
  const siteUrl = settings?.siteUrl || siteConfig.siteUrl;
  const whatsappNumber = settings?.whatsapp?.number || siteConfig.whatsapp.number;
  const currencySymbol = settings?.delivery?.currencySymbol || product.currencySymbol;

  const urlToShare = sourceUrl || `${siteUrl}/products/${product.slug}`;

  const message = [
    `Hello ${brandName},`,
    ``,
    `I would like to order / check availability for:`,
    ``,
    `• Product: ${product.name}`,
    `• Price: ${currencySymbol}${product.price.toLocaleString()}`,
    `• Style: ${product.frameShape}`,
    `• Frame: ${product.frameColor}`,
    `• Lens: ${product.lensColor}`,
    `• Product URL: ${urlToShare}`,
    ``,
    `Please confirm current availability, final specifications, delivery and ordering details.`,
    ``,
    `Thank you.`,
  ].join("\n");

  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Builds a general concierge inquiry link with optional live site settings.
 */
export function buildGeneralWhatsAppUrl(
  customMessage?: string,
  settings?: Partial<OperationalSettings>
): string {
  const whatsappNumber = settings?.whatsapp?.number || siteConfig.whatsapp.number;
  const msg =
    customMessage ||
    settings?.whatsapp?.defaultGreeting ||
    siteConfig.whatsapp.defaultGreeting;
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`;
}