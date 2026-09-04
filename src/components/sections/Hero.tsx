import Link from "next/link";
import Image from "next/image";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { buildGeneralWhatsAppUrl } from "@/lib/whatsapp";
import { ArrowRight, ShieldCheck, SunMedium, Compass } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-[85vh] lg:min-h-[90vh] flex items-center justify-center overflow-hidden border-b border-vantaire-border/60">
      {/* Background Cinematic Image with Luxury Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero/hero-sunglasses.jpg"
          alt="VANTAIRE Architectural Eyewear Collection"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-40 scale-105 animate-pulse-subtle"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-vantaire-black via-vantaire-black/70 to-vantaire-black/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-vantaire-black/50 to-vantaire-black" />
      </div>

      {/* Hero Content Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 border border-vantaire-champagne/40 bg-vantaire-black/80 backdrop-blur-md mb-6 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-vantaire-champagne animate-ping" />
          <span className="text-[10px] md:text-xs uppercase tracking-luxury text-vantaire-sand font-medium">
            2026 Eyewear Lookbook
          </span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-serif text-vantaire-warmWhite font-normal tracking-tight leading-[1.05] max-w-4xl animate-fade-up">
          Shade Your Presence.
        </h1>

        {/* Editorial Subtitle */}
        <p className="mt-6 text-sm sm:text-base md:text-lg text-vantaire-sand/90 max-w-2xl font-sans font-light leading-relaxed tracking-wide">
          Distinctive sunglasses silhouettes featuring architectural acetate and metal-look contours paired with refined sun tint optics.
        </p>

        {/* Hero CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link
            href="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-vantaire-warmWhite hover:bg-vantaire-sand text-vantaire-black font-sans uppercase font-semibold text-xs tracking-luxury transition-all shadow-xl hover:shadow-2xl active:scale-[0.98]"
          >
            <span>Explore The Collection</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <WhatsAppButton
            href={buildGeneralWhatsAppUrl("Hello VANTAIRE EYEWEAR, I would like to consult with your styling concierge to select a pair of sunglasses.")}
            size="lg"
            variant="outline"
            className="w-full sm:w-auto text-xs"
          >
            WhatsApp Concierge
          </WhatsAppButton>
        </div>

        {/* Quick Highlights Strip */}
        <div className="mt-16 pt-8 border-t border-vantaire-border/60 grid grid-cols-3 gap-6 text-center w-full max-w-2xl">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-vantaire-champagne">
              <SunMedium className="w-4 h-4" />
              <span className="text-xs uppercase tracking-luxury font-medium text-vantaire-warmWhite">Sun Tint</span>
            </div>
            <p className="text-[10px] text-vantaire-muted">Glare Defense Look</p>
          </div>

          <div className="space-y-1 border-x border-vantaire-border/40">
            <div className="flex items-center justify-center gap-1.5 text-vantaire-champagne">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs uppercase tracking-luxury font-medium text-vantaire-warmWhite">Design</span>
            </div>
            <p className="text-[10px] text-vantaire-muted">Curated Profiles</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-vantaire-champagne">
              <Compass className="w-4 h-4" />
              <span className="text-xs uppercase tracking-luxury font-medium text-vantaire-warmWhite">Nationwide</span>
            </div>
            <p className="text-[10px] text-vantaire-muted">Bangladesh Courier</p>
          </div>
        </div>
      </div>
    </section>
  );
}