export type FrameShape = 
  | "Aviator"
  | "Square"
  | "Round"
  | "Cat-Eye"
  | "Geometric"
  | "Sport"
  | "Rectangular"
  | "Oversized"
  | "Browline";

export type LensType = 
  | "Polarized-Style Tint"
  | "Gradient Tint"
  | "Dark Sun Tint"
  | "Mirrored Finish";

export type FrameLook =
  | "Dark Metal-Look Alloy"
  | "Tortoise Acetate-Look"
  | "Gold-Tone Metal-Look"
  | "Jet Black Acetate-Look"
  | "Matte Slate Finish"
  | "Translucent Crystal Finish"
  | "Graphite Sport-Look"
  | "Amber Acetate-Look"
  | "Smoked Crystal Finish"
  | "Polished Gold & Acetate Combo";

export type CollectionSlug = 
  | "all"
  | "aviator"
  | "square"
  | "round"
  | "cat-eye"
  | "polarized"
  | "sport";

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
  frameLook: FrameLook;
  frameColor: string;
  lensColor: string;
  lensType: LensType;
  styleCategory: "Classic" | "Contemporary" | "Sport" | "Retro" | "Architectural";
  fit: "Narrow" | "Medium" | "Wide" | "Universal";
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