import { Hero } from "@/components/sections/Hero";
import { CollectionsPreview } from "@/components/sections/CollectionsPreview";
import { EditorialStory } from "@/components/sections/EditorialStory";
import { FinalCtaSection } from "@/components/sections/FinalCtaSection";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductGrid } from "@/components/product/ProductGrid";
import { getFeaturedProducts, getBestSellers } from "@/lib/products";
import Link from "next/link";
import { ArrowRight, Sparkles, Shield, MessageSquare } from "lucide-react";

export default function HomePage() {
  const featured = getFeaturedProducts();
  const bestSellers = getBestSellers();

  const occasions = [
    {
      title: "Daily Architectural",
      desc: "Balanced silhouettes for office, cafe appointments, and city strolls.",
      image: "https://images.unsplash.com/photo-1508296695146-257a814070b4?q=80&w=800&auto=format&fit=crop",
      link: "/collections/square"
    },
    {
      title: "Coastal & Travel",
      desc: "Glare-deflecting polarized lenses designed for open water and high sun.",
      image: "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?q=80&w=800&auto=format&fit=crop",
      link: "/collections/polarized"
    },
    {
      title: "Highway & Driving",
      desc: "Carefully calibrated tint gradient designed for clear roadway and horizon vision.",
      image: "https://images.unsplash.com/photo-1577803645773-f96470509666?q=80&w=800&auto=format&fit=crop",
      link: "/collections/aviator"
    },
    {
      title: "Motion & Active",
      desc: "Wrap-around sports frames engineered for dynamic movement and outdoor endurance.",
      image: "https://images.unsplash.com/photo-1574258495973-f010dfbb5371?q=80&w=800&auto=format&fit=crop",
      link: "/collections/sport"
    }
  ];

  return (
    <div>
      {/* 1. HERO */}
      <Hero />

      {/* 2. SIGNATURE EDITS / FEATURED PRODUCTS */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Curated For 2026"
          title="The Signature Edit"
          subtitle="Precision-formed silhouettes embodying architectural luxury and optical clarity."
        />
        <ProductGrid products={featured.slice(0, 6)} priorityCount={3} />
        <div className="mt-12 text-center">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-luxury text-vantaire-warmWhite hover:text-vantaire-champagne border-b border-vantaire-champagne/60 pb-1 font-semibold group transition-colors"
          >
            <span>View Complete Storefront Catalog</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {/* 3. SHOP BY SILHOUETTE / COLLECTIONS */}
      <section className="py-20 border-t border-vantaire-border/60 bg-vantaire-charcoal/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Form & Contour"
            title="Shop By Silhouette"
            subtitle="Explore our defined profiles: from aviator geometries to sculpted acetate cat-eyes."
          />
          <CollectionsPreview />
        </div>
      </section>

      {/* 4. EDITORIAL BRAND STORY */}
      <EditorialStory />

      {/* 5. BEST SELLERS */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Curated Selection"
          title="The Vanguard Series"
          subtitle="Popular frame silhouettes designed for presence and everyday versatility."
        />
        <ProductGrid products={bestSellers.slice(0, 6)} priorityCount={2} />
      </section>

      {/* 6. OCCASIONS & LIVING */}
      <section className="py-20 border-t border-vantaire-border/60 bg-vantaire-charcoal/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Versatility"
            title="Engineered For Occasion"
            subtitle="Tailored optical balances designed for every scenario under the sun."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {occasions.map((occ) => (
              <Link
                key={occ.title}
                href={occ.link}
                className="group relative h-96 overflow-hidden bg-vantaire-charcoal border border-vantaire-border/60 hover:border-vantaire-champagne/60 transition-all duration-300 flex flex-col justify-end p-6"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:opacity-75 group-hover:scale-105 transition-all duration-700"
                  style={{ backgroundImage: `url(${occ.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-vantaire-black via-vantaire-black/40 to-transparent" />
                <div className="relative z-10 space-y-2">
                  <h3 className="font-serif text-xl text-vantaire-warmWhite group-hover:text-vantaire-champagne transition-colors">
                    {occ.title}
                  </h3>
                  <p className="text-xs text-vantaire-sand/80 font-sans leading-relaxed">
                    {occ.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 7. WHY CHOOSE VANTAIRE */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Integrity"
          title="The VANTAIRE Standard"
          subtitle="Every design choice is intentional, from optical clarity to packaging tactile feel."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-vantaire-charcoal/40 border border-vantaire-border/70 p-8 space-y-4">
            <div className="w-10 h-10 rounded-none bg-vantaire-black border border-vantaire-champagne/40 flex items-center justify-center text-vantaire-champagne">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-xl text-vantaire-warmWhite">UV400 Optics Focus</h3>
            <p className="text-xs text-vantaire-muted font-sans leading-relaxed">
              Designed with full UV400 solar filtration to reduce radiation fatigue and preserve visual comfort under bright sunlight.
            </p>
          </div>

          <div className="bg-vantaire-charcoal/40 border border-vantaire-border/70 p-8 space-y-4">
            <div className="w-10 h-10 rounded-none bg-vantaire-black border border-vantaire-champagne/40 flex items-center justify-center text-vantaire-champagne">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-xl text-vantaire-warmWhite">Tactile Craftsmanship</h3>
            <p className="text-xs text-vantaire-muted font-sans leading-relaxed">
              Structured block acetate and durable metal alloys engineered for structural stability, rich color depth, and reliable daily wear.
            </p>
          </div>

          <div className="bg-vantaire-charcoal/40 border border-vantaire-border/70 p-8 space-y-4">
            <div className="w-10 h-10 rounded-none bg-vantaire-black border border-vantaire-champagne/40 flex items-center justify-center text-vantaire-champagne">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-xl text-vantaire-warmWhite">Human Concierge Model</h3>
            <p className="text-xs text-vantaire-muted font-sans leading-relaxed">
              No generic cart roadblocks. You communicate directly with a dedicated styling assistant on WhatsApp before confirming dispatch.
            </p>
          </div>
        </div>
      </section>

      {/* 8. FINAL CONVERSION SECTION */}
      <FinalCtaSection />
    </div>
  );
}