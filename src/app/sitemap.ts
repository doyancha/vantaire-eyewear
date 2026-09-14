import { MetadataRoute } from "next";
import { getProducts, getCollections, getSiteSettings } from "@/lib/data/storefront";
import { siteConfig } from "@/lib/config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, settings] = await Promise.all([
    getProducts(),
    getCollections(),
    getSiteSettings(),
  ]);

  const baseUrl = settings.siteUrl || siteConfig.siteUrl;

  const productRoutes = products.map((product) => ({
    url: `${baseUrl}/products/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const collectionRoutes = collections.map((col) => ({
    url: `${baseUrl}/collections/${col.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const staticRoutes = [
    "",
    "/shop",
    "/collections",
    "/about",
    "/faq",
    "/contact",
    "/shipping",
    "/returns",
    "/privacy",
    "/terms",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1.0 : 0.7,
  }));

  return [...staticRoutes, ...collectionRoutes, ...productRoutes];
}