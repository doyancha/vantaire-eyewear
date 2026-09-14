import { Metadata } from "next";
import { getProducts } from "@/lib/data/storefront";
import { ShopCatalogClient } from "./ShopCatalogClient";

export const metadata: Metadata = {
  title: "Shop All Sunglasses | Architectural Luxury Eyewear",
  description:
    "Explore the complete collection of VANTAIRE eyewear. Handcrafted luxury acetate and titanium sunglasses engineered with precision.",
};

export default async function ShopPage() {
  const products = await getProducts();
  return <ShopCatalogClient products={products} />;
}