import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollectionsMeta, getCollectionMetaBySlug, getProductsByCollection } from "@/lib/products";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SectionHeading } from "@/components/ui/SectionHeading";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface CollectionPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const collections = getCollectionsMeta();
  return collections.map((col) => ({
    slug: col.slug,
  }));
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const col = getCollectionMetaBySlug(slug);

  if (!col) {
    return {
      title: "Collection Not Found | VANTAIRE EYEWEAR",
    };
  }

  return {
    title: `${col.name} — ${col.tagline}`,
    description: col.description,
    openGraph: {
      title: `${col.name} | VANTAIRE EYEWEAR`,
      description: col.description,
      images: [{ url: col.coverImage }],
    },
  };
}

export default async function CollectionDetailPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const collection = getCollectionMetaBySlug(slug);

  if (!collection) {
    notFound();
  }

  const products = getProductsByCollection(collection.slug);

  return (
    <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
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
            <Link href="/collections" className="hover:text-vantaire-champagne transition-colors">
              Collections
            </Link>
          </li>
          <li>
            <ChevronRight className="w-3 h-3" />
          </li>
          <li className="text-vantaire-warmWhite font-medium">
            {collection.name}
          </li>
        </ol>
      </nav>

      {/* Collection Hero Heading */}
      <SectionHeading
        eyebrow={collection.tagline}
        title={collection.name}
        subtitle={collection.description}
      />

      {/* Products Grid */}
      <div className="mt-8">
        <ProductGrid products={products} priorityCount={3} />
      </div>
    </div>
  );
}