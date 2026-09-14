export interface CatalogMetrics {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  inStockProducts: number;
  outOfStockProducts: number;
}

export interface MerchandisingMetrics {
  featuredProducts: number;
  bestSellers: number;
  newArrivals: number;
}

export interface CollectionSummary {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  productCount: number;
  coverImage: string;
}

export interface CollectionsMetrics {
  totalCollections: number;
  activeCollections: number;
  inactiveCollections: number;
  items: CollectionSummary[];
}

export interface MediaMetrics {
  totalImageRecords: number;
  productsWithPrimaryImage: number;
  productsMissingPrimaryImage: number;
  productsMissingAnyImage: number;
  isHealthy: boolean;
}

export interface SeoMetrics {
  healthyProducts: number;
  missingTitle: number;
  missingDescription: number;
  isHealthy: boolean;
}

export interface SettingsMetrics {
  isConfigured: boolean;
  hasWhatsapp: boolean;
  hasDeliveryFees: boolean;
  whatsappNumber: string;
  deliveryFeeInsideDhaka: number;
  deliveryFeeOutsideDhaka: number;
}

export interface AdminDashboardData {
  catalog: CatalogMetrics;
  merchandising: MerchandisingMetrics;
  collections: CollectionsMetrics;
  media: MediaMetrics;
  seo: SeoMetrics;
  settings: SettingsMetrics;
  renderedAt: string;
}
