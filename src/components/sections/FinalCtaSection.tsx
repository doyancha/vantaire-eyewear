import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { siteConfig } from "@/lib/config";
import { buildGeneralWhatsAppUrl } from "@/lib/whatsapp";
import { Clock, ShieldCheck, MapPin } from "lucide-react";

export function FinalCtaSection() {
  return (
    <section className="relative py-20 lg:py-28 bg-gradient-to-b from-vantaire-black via-vantaire-charcoal to-vantaire-black border-t border-vantaire-border/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        <span className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-vantaire-champagne font-semibold block">
          Client Concierge & Direct Ordering
        </span>

        <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal text-vantaire-warmWhite tracking-tight leading-tight">
          Ready to Shade Your Presence?
        </h2>

        <p className="text-xs sm:text-base text-vantaire-sand/90 font-sans max-w-2xl mx-auto leading-relaxed">
          Select any frame from our catalog or message our concierge directly on WhatsApp. We will confirm sizing, provide frame photos or videos upon request, and deliver nationwide across Bangladesh.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <WhatsAppButton
            href={buildGeneralWhatsAppUrl("Hello VANTAIRE EYEWEAR, I would like to order a pair of sunglasses and confirm delivery.")}
            size="lg"
            variant="primary"
            className="w-full sm:w-auto"
          >
            Order on WhatsApp Directly
          </WhatsAppButton>
        </div>

        {/* Quick Trust Badges */}
        <div className="pt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-vantaire-muted">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-vantaire-champagne" />
            <span>{siteConfig.delivery.insideDhakaTime} in Dhaka</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-vantaire-champagne" />
            <span>Cash on Delivery Available</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-vantaire-champagne" />
            <span>{siteConfig.contact.serviceArea}</span>
          </div>
        </div>
      </div>
    </section>
  );
}