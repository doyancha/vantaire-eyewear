import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getAllProducts, getRelatedProducts } from "@/lib/products";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { StickyWhatsAppOrder } from "@/components/product/StickyWhatsAppOrder";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { siteConfig } from "@/lib/config";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const products = getAllProducts();
  return products.map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product Not Found | VANTAIRE EYEWEAR",
    };
  }

  return {
    title: product.seoTitle,
    description: product.seoDescription,
    openGraph: {
      title: product.seoTitle,
      description: product.seoDescription,
      images: [
        {
          url: product.images[0],
          width: 1000,
          height: 1000,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: product.seoTitle,
      description: product.seoDescription,
      images: [product.images[0]],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const related = getRelatedProducts(product.slug, 3);

  // Honest Structured Data (Schema.org Product without unverified specs, ratings or manufacturing claims)
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    image: product.images,
    description: product.description,
    brand: {
      "@type": "Brand",
      name: siteConfig.brandName,
    },
    offers: {
      "@type": "Offer",
      url: `${siteConfig.siteUrl}/products/${product.slug}`,
      priceCurrency: product.currency,
      price: product.price,
      availability: "https://schema.org/PreOrder",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="pb-24 pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center space-x-2 text-xs text-vantaire-muted tracking-wider uppercase">
            <li>
              <Link href="/" className="hover:text-vantaire-champagne transition-colors">
                Home
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3 h-3" />
            </li>
            <li>
              <Link href="/shop" className="hover:text-vantaire-champagne transition-colors">
                Shop
              </Link>
            </li>
            <li>
              <ChevronRight className="w-3 h-3" />
            </li>
            <li className="text-vantaire-warmWhite font-medium truncate max-w-[200px] sm:max-w-none" aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <ProductGallery images={product.images} productName={product.name} />
          <ProductInfo product={product} />
        </div>

        <div className="mt-24 pt-16 border-t border-vantaire-border/60">
          <SectionHeading
            eyebrow="Design Profile"
            title="Observable Characteristics"
            subtitle="Explore the styling contours and aesthetic details of this frame model."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {product.features.map((feature, idx) => (
              <div
                key={idx}
                className="bg-vantaire-charcoal/40 border border-vantaire-border/70 p-6 space-y-3"
              >
                <span className="text-[10px] font-mono text-vantaire-champagne font-bold">
                  0{idx + 1}
                </span>
                <p className="text-xs text-vantaire-sand leading-relaxed">
                  {feature}
                </p>
              </div>
            ))}
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-24 pt-16 border-t border-vantaire-border/60">
            <SectionHeading
              eyebrow="Complementary Silhouettes"
              title="You May Also Appreciate"
              subtitle="Frames sharing similar aesthetic presence and curated design direction."
            />
            <ProductGrid products={related} priorityCount={1} />
          </div>
        )}
      </div>

      <StickyWhatsAppOrder product={product} />
    </div>
  );
}