import { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { buildGeneralWhatsAppUrl } from "@/lib/whatsapp";
import { RefreshCw, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Exchange & Damaged Product Policy",
  description: "Read the VANTAIRE EYEWEAR change-of-mind, size exchange, and damaged product guidelines.",
};

export default function ReturnsPage() {
  return (
    <div className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Order Support"
        title="Exchange & Product Policy"
        subtitle="Clear, reasonable guidelines for frame exchanges and transit damage resolution."
      />

      <div className="space-y-8 text-sm text-vantaire-sand/90 font-sans leading-relaxed">
        {/* Policy Status Note */}
        <div className="p-4 bg-vantaire-charcoal/40 border border-vantaire-border/80 text-xs text-vantaire-muted flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-vantaire-champagne flex-shrink-0 mt-0.5" />
          <p>
            Note: This page outlines our current operational storefront guidelines. All order consultations, sizing advice, and exchange requests are handled personally via WhatsApp.
          </p>
        </div>

        {/* Section A: Preference / Sizing Exchange */}
        <div className="bg-vantaire-charcoal/50 border border-vantaire-border/80 p-6 space-y-4">
          <div className="flex items-center gap-2 text-vantaire-champagne">
            <RefreshCw className="w-5 h-5" />
            <h3 className="font-serif text-xl text-vantaire-warmWhite">A. Change-of-Mind / Size & Style Exchange</h3>
          </div>
          <p className="text-xs text-vantaire-muted leading-relaxed">
            If the sunglasses silhouette does not suit your face or personal preference, you may request an exchange subject to stock availability and inspection:
          </p>
          <ul className="space-y-2 text-xs text-vantaire-sand">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>Contact VANTAIRE through WhatsApp promptly after receiving your delivery.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>Product must remain completely unused and in original, pristine condition without scratches.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>Original protective hard case, cleaning cloth, pouch, and packaging accessories must be retained.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>Delivery and return courier charges associated with preference-based exchanges are payable by the customer.</span>
            </li>
          </ul>
        </div>

        {/* Section B: Damaged or Wrong Product */}
        <div className="bg-vantaire-charcoal/50 border border-vantaire-border/80 p-6 space-y-4">
          <div className="flex items-center gap-2 text-vantaire-champagne">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-serif text-xl text-vantaire-warmWhite">B. Damaged or Wrong Product Received</h3>
          </div>
          <p className="text-xs text-vantaire-muted leading-relaxed">
            In the event that you receive damaged merchandise, an incorrect frame model, or a materially defective item:
          </p>
          <ul className="space-y-2 text-xs text-vantaire-sand">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>Contact us on WhatsApp as soon as possible after receiving the parcel.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>Provide clear photographs or an unboxing video showing the packaging and the defect.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>Our concierge will promptly review your case and arrange an appropriate replacement or resolution.</span>
            </li>
          </ul>
        </div>

        {/* Section C: Non-Returnable Conditions */}
        <div className="bg-vantaire-charcoal/30 border border-vantaire-border/70 p-6 space-y-3">
          <h3 className="font-serif text-lg text-vantaire-warmWhite">C. Conditions Ineligible for Exchange</h3>
          <p className="text-xs text-vantaire-muted leading-relaxed">
            Products showing visible signs of wear, surface scratches caused by customer handling, items damaged after delivery, or items with missing packaging accessories are ineligible for preference-based exchange.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4 text-center">
          <WhatsAppButton
            href={buildGeneralWhatsAppUrl("Hello VANTAIRE Concierge, I would like to inquire about an order exchange or report an issue.")}
            size="md"
            variant="secondary"
          >
            Contact Concierge on WhatsApp
          </WhatsAppButton>
        </div>
      </div>
    </div>
  );
}