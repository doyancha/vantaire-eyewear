import { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { buildGeneralWhatsAppUrl } from "@/lib/whatsapp";
import { MessageCircle, Phone, Mail, MapPin, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Client Concierge & Contact",
  description: "Connect with VANTAIRE EYEWEAR. Direct WhatsApp concierge, customer service hours, and order inquiries across Bangladesh.",
};

export default function ContactPage() {
  return (
    <div className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Direct Concierge"
        title="Connect With The House"
        subtitle="All order inquiries, sizing consultations, and customer assistance are handled directly via WhatsApp."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Left: WhatsApp Direct Card */}
        <div className="bg-gradient-to-b from-vantaire-charcoal to-vantaire-black border border-emerald-500/40 p-8 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <MessageCircle className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-2xl text-vantaire-warmWhite">
              WhatsApp Concierge
            </h3>
            <p className="text-xs text-vantaire-sand/90 font-sans leading-relaxed">
              Our primary channel for order placements, frame availability checks, real product photos, and order confirmations.
            </p>
            <div className="p-4 bg-vantaire-black/70 border border-vantaire-border/80 text-xs text-vantaire-sand space-y-1">
              <span className="text-[10px] uppercase tracking-luxury text-vantaire-muted block">Direct Concierge Number</span>
              <span className="font-mono text-sm font-semibold text-emerald-400">{siteConfig.whatsapp.displayNumber}</span>
            </div>
          </div>

          <WhatsAppButton
            href={buildGeneralWhatsAppUrl()}
            size="lg"
            variant="primary"
            className="w-full"
          >
            Start WhatsApp Conversation
          </WhatsAppButton>
        </div>

        {/* Right: Business Details & Schedule */}
        <div className="bg-vantaire-charcoal/40 border border-vantaire-border/80 p-8 space-y-6">
          <h3 className="font-serif text-2xl text-vantaire-warmWhite">
            Business Information
          </h3>

          <div className="space-y-4 text-xs text-vantaire-sand font-sans">
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-vantaire-champagne flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-vantaire-warmWhite block">Concierge Hours</span>
                <span className="text-vantaire-muted">{siteConfig.contact.hours}</span>
                <span className="text-vantaire-muted/80 block mt-0.5">{siteConfig.contact.fridayHours}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-vantaire-champagne flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-vantaire-warmWhite block">Location</span>
                <span className="text-vantaire-muted">{siteConfig.contact.location}</span>
                <span className="text-[11px] text-vantaire-champagne block mt-0.5">{siteConfig.contact.serviceArea}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-vantaire-champagne flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-vantaire-warmWhite block">Email</span>
                <a href={`mailto:${siteConfig.contact.email}`} className="text-vantaire-muted hover:text-vantaire-champagne transition-colors">
                  {siteConfig.contact.email}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-vantaire-champagne flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-vantaire-warmWhite block">Customer Phone</span>
                <span className="text-vantaire-muted">{siteConfig.contact.phone}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-vantaire-charcoal/60 border border-vantaire-border/60 text-[11px] text-vantaire-muted leading-relaxed">
            Note: We operate as an online direct-to-consumer eyewear storefront. All orders and consultations are conducted via WhatsApp.
          </div>
        </div>
      </div>
    </div>
  );
}