import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { buildGeneralWhatsAppUrl } from "@/lib/whatsapp";
import { Sparkles, Eye, Shield, Award, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "About the Atelier & Philosophy",
  description: "Learn about VANTAIRE EYEWEAR — luxury eyewear crafted with aerospace titanium and Mazzucchelli acetate, engineered for confident presence.",
};

export default function AboutPage() {
  return (
    <div className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="The Atelier"
          title="Presence in Every Angle."
          subtitle="VANTAIRE is an independent eyewear label dedicated to precision geometry, optical purity, and timeless modern confidence."
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
              Why We Refuse Generic Standards
            </h3>
            <p>
              Most commercial sunglasses are mass-stamped from cheap injection plastic with lenses that darken visible light without adequately filtering ultraviolet radiation or eliminating reflective surface glare.
            </p>
            <p>
              VANTAIRE was conceived to invert this paradigm. We source hand-cured block acetate from historic workshops in Italy and combine it with cold-milled aerospace titanium chassis from Japan. The result is eyewear that feels substantial yet featherlight on your face, keeping you comfortable through tropical heat and long drives.
            </p>
            <p>
              By bypassing traditional brick-and-mortar optical middle layers and instead operating through a dedicated WhatsApp concierge, we deliver bespoke, collector-level quality straight to clients across Dhaka and nationwide Bangladesh.
            </p>
          </div>

          <div className="bg-vantaire-charcoal/50 border border-vantaire-border/80 p-8 space-y-6">
            <h4 className="font-serif text-xl text-vantaire-warmWhite">
              Our 4 Pillars of Integrity
            </h4>

            <div className="space-y-4">
              <div className="flex gap-3.5">
                <Shield className="w-5 h-5 text-vantaire-champagne flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">100% UV400 Optic Standards</h5>
                  <p className="text-xs text-vantaire-muted mt-1 leading-relaxed">Guaranteed full spectrum blockage of UVA and UVB wavelengths up to 400 nanometers.</p>
                </div>
              </div>

              <div className="flex gap-3.5">
                <Eye className="w-5 h-5 text-vantaire-champagne flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">Tri-Acetate Japanese Polarized Lenses</h5>
                  <p className="text-xs text-vantaire-muted mt-1 leading-relaxed">Precision glare reduction designed to sharpen asphalt lines, coastal horizons, and tropical water reflections.</p>
                </div>
              </div>

              <div className="flex gap-3.5">
                <Sparkles className="w-5 h-5 text-vantaire-champagne flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">Hand-Polished Mazzucchelli Acetate</h5>
                  <p className="text-xs text-vantaire-muted mt-1 leading-relaxed">Cured organically to ensure deep, luminous depth of color and exceptional structural resilience.</p>
                </div>
              </div>

              <div className="flex gap-3.5">
                <CheckCircle className="w-5 h-5 text-vantaire-champagne flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">Frictionless Human Ordering</h5>
                  <p className="text-xs text-vantaire-muted mt-1 leading-relaxed">Direct WhatsApp ordering with verified frame checks and fast nationwide Cash on Delivery.</p>
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
            Send a photo or your face measurements to our WhatsApp concierge. Our styling specialists will recommend the ideal frame widths and silhouettes for you.
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