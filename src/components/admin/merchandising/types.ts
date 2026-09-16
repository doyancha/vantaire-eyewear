export interface AdminProductMerchandisingRow {
  id: string; // uuid
  legacy_id: string; // vnt-xx
  slug: string;
  name: string;
  primary_image: string | null;
  is_active: boolean;
  in_stock: boolean;
  badge: string | null;
  featured: boolean;
  best_seller: boolean;
  new_arrival: boolean;
  sort_order: number;
  updated_at: string;
}

export interface AdminCollectionOrderingRow {
  id: string; // uuid
  slug: string;
  name: string;
  cover_image: string | null;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
  product_count: number;
}
