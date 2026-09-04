export type FrameShape = 
  | "Aviator"
  | "Square"
  | "Round"
  | "Cat-Eye"
  | "Geometric"
  | "Sport"
  | "Rectangular"
  | "Oversized";

export type LensType = 
  | "Polarized"
  | "Gradient"
  | "Solid UV400"
  | "Mirrored"
  | "Photochromic";

export type FrameMaterial = 
  | "Italian Acetate"
  | "Aerospace Grade Titanium"
  | "Stainless Steel Alloy"
  | "Hand-Finished Monel Metal"
  | "Bio-Based Eco Acetate";

export type CollectionSlug = 
  | "all"
  | "aviator"
  | "square"
  | "round"
  | "cat-eye"
  | "polarized"
  | "sport";

export interface ProductDimensions {
  lensWidth: number;   // mm
  bridgeWidth: number; // mm
  templeLength: number;// mm
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  category: "Sunglasses";
  collection: CollectionSlug[];
  gender: "Unisex" | "Men" | "Women";
  price: number;
  compareAtPrice?: number;
  currency: string;
  currencySymbol: string;
  description: string;
  shortDescription: string;
  images: string[];
  frameShape: FrameShape;
  frameMaterial: FrameMaterial;
  frameColor: string;
  lensColor: string;
  lensType: LensType;
  polarized: boolean;
  uvProtection: string; // e.g. "100% UVA / UVB (UV400)"
  fit: "Narrow" | "Medium" | "Wide" | "Universal";
  dimensions: ProductDimensions;
  weightGrams: number;
  features: string[];
  badge?: "Bestseller" | "New Arrival" | "Limited Edition" | "Signature Edit";
  featured?: boolean;
  bestSeller?: boolean;
  newArrival?: boolean;
  inStock: boolean;
  seoTitle: string;
  seoDescription: string;
}

export interface CollectionMeta {
  slug: CollectionSlug;
  name: string;
  tagline: string;
  description: string;
  coverImage: string;
}
