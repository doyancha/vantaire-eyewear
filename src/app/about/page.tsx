import { Metadata } from "next";
import Image from "next/image";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { buildGeneralWhatsAppUrl } from "@/lib/whatsapp";
import { Sparkles, Eye, Shield, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "About the Atelier & Philosophy",
  description: "Learn about VANTAIRE EYEWEAR — luxury-inspired eyewear silhouettes engineered for confident presence.",
};

export default function AboutPage() {
  return (
    <div className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The Atelier"
          title="Presence in Every Angle."
          subtitle="VANTAIRE is an independent eyewear concept dedicated to precision geometry, clean lines, and timeless modern confidence."
        />

        {/* Hero Visual */}
        <div className="relative aspect-[16/9] md:aspect-[21/9] w-full overflow-hidden border border-vantaire-border/80 mb-20">
          <Image
            src="https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1800&auto=format&fit=crop"
            alt="VANTAIRE Eyewear Design Studio"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-vantaire-black via-transparent to-transparent" />
        </div>

        {/* Two-column Story */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-24">
          <div className="space-y-6 text-sm text-vantaire-sand/90 font-sans leading-relaxed">
            <h3 className="font-serif text-3xl text-vantaire-warmWhite font-normal">
              A Direct Approach to Eyewear
            </h3>
            <p>
              Eyewear should be an authentic expression of personal presence, facial geometry, and everyday sun comfort — without cumbersome shopping friction or inflated middleman overheads.
            </p>
            <p>
              VANTAIRE was conceived around curated silhouettes: bold square profiles, classic double-bridge aviators, minimalist round wires, and sharp sculpted cat-eyes. Each model balances strong architectural lines with everyday wearability.
            </p>
            <p>
              By operating through a direct WhatsApp concierge, we connect clients across Dhaka and nationwide Bangladesh directly with styling advice, frame recommendations, and transparent order tracking.
            </p>
          </div>

          <div className="bg-vantaire-charcoal/50 border border-vantaire-border/80 p-8 space-y-6">
            <h4 className="font-serif text-xl text-vantaire-warmWhite">
              Our Guiding Principles
            </h4>

            <div className="space-y-4">
              <div className="flex gap-3.5">
                <Shield className="w-5 h-5 text-vantaire-champagne flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">Sun Comfort & Clarity</h5>
                  <p className="text-xs text-vantaire-muted mt-1 leading-relaxed">Carefully tinted lenses designed to shield your eyes from harsh outdoor brightness.</p>
                </div>
              </div>

              <div className="flex gap-3.5">
                <Eye className="w-5 h-5 text-vantaire-champagne flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">Defined Silhouettes</h5>
                  <p className="text-xs text-vantaire-muted mt-1 leading-relaxed">Curated frame geometries styled to accentuate diverse facial structures.</p>
                </div>
              </div>

              <div className="flex gap-3.5">
                <Sparkles className="w-5 h-5 text-vantaire-champagne flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">Considered Finishes</h5>
                  <p className="text-xs text-vantaire-muted mt-1 leading-relaxed">Lustrous acetate-look patterns and brushed metallic tones for elevated aesthetic appeal.</p>
                </div>
              </div>

              <div className="flex gap-3.5">
                <CheckCircle className="w-5 h-5 text-vantaire-champagne flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">Direct Concierge Service</h5>
                  <p className="text-xs text-vantaire-muted mt-1 leading-relaxed">Personalized WhatsApp ordering with fast Cash on Delivery across Bangladesh.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Concierge Callout */}
        <div className="bg-vantaire-charcoal/30 border border-vantaire-champagne/40 p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-6">
          <span className="text-[10px] uppercase tracking-luxury text-vantaire-champagne font-semibold block">
            Personal Styling Consultation
          </span>
          <h3 className="font-serif text-2xl sm:text-4xl text-vantaire-warmWhite font-normal">
            Need Guidance on Face Shape & Proportions?
          </h3>
          <p className="text-xs sm:text-sm text-vantaire-sand/80 max-w-xl mx-auto leading-relaxed">
            Message our WhatsApp concierge for advice on frame styles, sizing, or colors that best match your look.
          </p>
          <div>
            <WhatsAppButton
              href={buildGeneralWhatsAppUrl("Hello VANTAIRE Atelier, I would like advice on selecting the right sunglasses for my face shape.")}
              size="md"
              variant="secondary"
            >
              Consult With Our Stylist on WhatsApp
            </WhatsAppButton>
          </div>
        </div>
      </div>
    </div>
  );
}