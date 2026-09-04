import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function EditorialStory() {
  return (
    <section className="py-20 lg:py-28 border-y border-vantaire-border/60 bg-vantaire-charcoal/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column: Visual Composition */}
          <div className="relative">
            <div className="relative aspect-[4/5] w-full max-w-lg mx-auto overflow-hidden bg-vantaire-charcoal border border-vantaire-border/80">
              <Image
                src="https://images.unsplash.com/photo-1509695503492-413ff566a383?q=80&w=1200&auto=format&fit=crop"
                alt="VANTAIRE Eyewear Concept"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-vantaire-black/60 via-transparent to-transparent" />
            </div>

            {/* Overlapping Floating Quote Card */}
            <div className="absolute -bottom-6 -right-2 sm:right-6 max-w-xs bg-vantaire-black/95 border border-vantaire-champagne/40 p-5 shadow-2xl backdrop-blur-md hidden sm:block">
              <p className="font-serif italic text-sm text-vantaire-warmWhite">
                “Eyewear shapes both how the world views you and how you experience the sunlight.”
              </p>
              <span className="block text-[10px] tracking-luxury uppercase text-vantaire-champagne mt-2 font-semibold">
                — Atelier Concept
              </span>
            </div>
          </div>

          {/* Right Column: Editorial Copy */}
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-luxury text-vantaire-champagne font-semibold block">
                The House Philosophy
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-vantaire-warmWhite leading-tight">
                Architectural Eyewear.<br />
                Considered Design.
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-vantaire-muted font-sans leading-relaxed">
              VANTAIRE EYEWEAR was conceived to celebrate bold silhouettes, balanced geometry, and practical sun protection — offering luxury styling through a direct, attentive client model.
            </p>

            <p className="text-xs sm:text-sm text-vantaire-muted font-sans leading-relaxed">
              Our curated shapes feature structured acetate and metal-look contours, fitted with tinted sun optics designed to handle bright days while maintaining clear, comfortable vision.
            </p>

            {/* Core Pillars */}
            <div className="pt-2 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-vantaire-champagne mt-0.5 flex-shrink-0" />
                <span className="text-xs text-vantaire-sand font-medium">
                  <strong>Selected Profiles:</strong> Distinctive frame silhouettes featuring rich tortoiseshell patterns and brushed metal tones.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-vantaire-champagne mt-0.5 flex-shrink-0" />
                <span className="text-xs text-vantaire-sand font-medium">
                  <strong>Optical Sun Comfort:</strong> Balanced sun-tinted lenses tailored to soften glare and preserve visual ease.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-vantaire-champagne mt-0.5 flex-shrink-0" />
                <span className="text-xs text-vantaire-sand font-medium">
                  <strong>Direct WhatsApp Commerce:</strong> No complex forms. Consult directly with our team on WhatsApp before ordering.
                </span>
              </div>
            </div>

            <div className="pt-4">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-luxury text-vantaire-champagne hover:text-vantaire-gold font-semibold group"
              >
                <span>Read The Brand Philosophy</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}