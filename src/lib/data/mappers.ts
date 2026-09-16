import { Product, CollectionMeta, CollectionSlug } from "@/types/catalog";
import { siteConfig } from "@/lib/config";
import { buildPublicStorageUrl } from "./media";

export interface OperationalSettings {
  brandName: string;
  brandShort: string;
  tagline: string;
  subTagline: string;
  siteUrl: string;
  whatsapp: {
    number: string;
    displayNumber: string;
    isDemo: boolean;
    defaultGreeting: string;
  };
  contact: {
    phone: string;
    email: string;
    hours: string;
    fridayHours: string;
    location: string;
    serviceArea: string;
  };
  delivery: {
    insideDhakaTime: string;
    outsideDhakaTime: string;
    feeInsideDhaka: number;
    feeOutsideDhaka: number;
    currencySymbol: string;
    currencyCode: string;
    cashOnDelivery: boolean;
    advancePaymentNote: string;
    packaging: string;
  };
  social: {
    instagram: string;
    facebook: string;
  };
}

/**
 * Maps raw database product row (with joined images and memberships) into the Product domain model.
 * Invariant: Product.id remains legacy_id ('vnt-01' ... 'vnt-42') to preserve historical identity.
 */
export function mapDbProduct(
  row: any,
  options?: { resolveStorageUrls?: boolean }
): Product {
  const resolveUrls = options?.resolveStorageUrls ?? true;

  // Extract and sort product_images by sort_order
  const rawImages = row.product_images || [];
  const sortedImages = [...rawImages].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );

  const images = sortedImages
    .map((img: any) =>
      resolveUrls ? buildPublicStorageUrl(img.storage_path) : img.storage_path
    )
    .filter(Boolean);

  const finalImages =
    images.length > 0 ? images : [`/images/products/${row.slug}.jpg`];

  // Extract and reconstruct collections as CollectionSlug[]
  const rawCollections = row.product_collections || [];
  const sortedCollections = [...rawCollections].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );

  const collections: CollectionSlug[] = sortedCollections
    .map((pc: any) => pc.collections?.slug || pc.collection_slug)
    .filter(Boolean);

  return {
    id: row.legacy_id,
    slug: row.slug,
    name: row.name,
    shortName: row.short_name,
    category: row.category as "Sunglasses",
    collection: collections,
    gender: row.gender as "Unisex" | "Men" | "Women",
    price: Number(row.price),
    compareAtPrice: row.compare_at_price != null ? Number(row.compare_at_price) : undefined,
    currency: row.currency,
    currencySymbol: row.currency_symbol,
    description: row.description,
    shortDescription: row.short_description,
    images: finalImages,
    frameShape: row.frame_shape,
    frameLook: row.frame_look,
    frameColor: row.frame_color,
    lensColor: row.lens_color,
    lensType: row.lens_type,
    styleCategory: row.style_category,
    fit: row.fit,
    features: Array.isArray(row.features) ? row.features : [],
    badge: row.badge ?? undefined,
    featured: Boolean(row.featured),
    bestSeller: Boolean(row.best_seller),
    newArrival: Boolean(row.new_arrival),
    inStock: Boolean(row.in_stock),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}

/**
 * Maps raw database collection row into CollectionMeta domain model.
 */
export function mapDbCollection(
  row: any,
  options?: { resolveStorageUrls?: boolean }
): CollectionMeta {
  if (row.is_active && (!row.cover_image || typeof row.cover_image !== "string" || row.cover_image.trim().length === 0)) {
    throw new Error(`Invariant violation: Active collection '${row.slug || row.id}' is missing required cover_image`);
  }

  const resolveUrls = options?.resolveStorageUrls ?? true;
  const coverImage =
    resolveUrls && row.cover_image
      ? buildPublicStorageUrl(row.cover_image)
      : row.cover_image || `/images/collections/collection-${row.slug}.jpg`;

  return {
    slug: row.slug as CollectionSlug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    coverImage,
  };
}

/**
 * Maps database site_settings row into OperationalSettings structure.
 * Preserves static brand configuration while sourcing live operational fields.
 */
export function mapDbSiteSettings(row: any): OperationalSettings {
  return {
    brandName: siteConfig.brandName,
    brandShort: siteConfig.brandShort,
    tagline: siteConfig.tagline,
    subTagline: siteConfig.subTagline,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || siteConfig.siteUrl,
    whatsapp: {
      number: row.whatsapp_number ?? siteConfig.whatsapp.number,
      displayNumber: row.whatsapp_display_number ?? siteConfig.whatsapp.displayNumber,
      isDemo: row.whatsapp_is_demo ?? siteConfig.whatsapp.isDemo,
      defaultGreeting: row.whatsapp_default_greeting ?? siteConfig.whatsapp.defaultGreeting,
    },
    contact: {
      phone: row.contact_phone ?? siteConfig.contact.phone,
      email: row.contact_email ?? siteConfig.contact.email,
      hours: row.contact_hours ?? siteConfig.contact.hours,
      fridayHours: row.contact_friday_hours ?? siteConfig.contact.fridayHours,
      location: row.contact_location ?? siteConfig.contact.location,
      serviceArea: row.contact_service_area ?? siteConfig.contact.serviceArea,
    },
    delivery: {
      insideDhakaTime: row.delivery_inside_dhaka_time ?? siteConfig.delivery.insideDhakaTime,
      outsideDhakaTime: row.delivery_outside_dhaka_time ?? siteConfig.delivery.outsideDhakaTime,
      feeInsideDhaka: row.delivery_fee_inside_dhaka != null ? Number(row.delivery_fee_inside_dhaka) : siteConfig.delivery.feeInsideDhaka,
      feeOutsideDhaka: row.delivery_fee_outside_dhaka != null ? Number(row.delivery_fee_outside_dhaka) : siteConfig.delivery.feeOutsideDhaka,
      currencySymbol: row.delivery_currency_symbol ?? siteConfig.delivery.currencySymbol,
      currencyCode: row.delivery_currency_code ?? siteConfig.delivery.currencyCode,
      cashOnDelivery: row.delivery_cash_on_delivery ?? siteConfig.delivery.cashOnDelivery,
      advancePaymentNote: row.delivery_advance_payment_note ?? siteConfig.delivery.advancePaymentNote,
      packaging: row.delivery_packaging ?? siteConfig.delivery.packaging,
    },
    social: {
      instagram: row.social_instagram ?? siteConfig.social.instagram,
      facebook: row.social_facebook ?? siteConfig.social.facebook,
    },
  };
}
