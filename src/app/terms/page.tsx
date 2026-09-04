import { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions of purchase for VANTAIRE EYEWEAR.",
};

export default function TermsPage() {
  return (
    <div className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Commercial Protocol"
        title="Terms of Service"
        subtitle="Operational and fulfillment terms governing purchases with VANTAIRE EYEWEAR."
      />

      <div className="space-y-6 text-xs sm:text-sm text-vantaire-sand/90 font-sans leading-relaxed bg-vantaire-charcoal/30 border border-vantaire-border/80 p-6 sm:p-8">
        <p>Effective Date: September 2026</p>

        <h3 className="font-serif text-lg text-vantaire-warmWhite">1. Order Confirmation Protocol</h3>
        <p>
          Selecting a pair of sunglasses on our website constitutes an expression of purchase intent. An order is formally confirmed only when our customer concierge acknowledges your request on WhatsApp and you provide valid delivery credentials.
        </p>

        <h3 className="font-serif text-lg text-vantaire-warmWhite">2. Pricing & Currency</h3>
        <p>
          All product prices are quoted in Bangladeshi Taka (BDT / ৳) and are inclusive of standard local taxes. Delivery charges (৳{siteConfig.delivery.feeInsideDhaka} within Dhaka, ৳{siteConfig.delivery.feeOutsideDhaka} nationwide) are added at the time of final confirmation.
        </p>

        <h3 className="font-serif text-lg text-vantaire-warmWhite">3. Delivery & Courier Handover</h3>
        <p>
          We partner with leading registered express courier networks. While we adhere strictly to our 24–72 hour dispatch targets, occasional transit delays attributable to adverse weather or logistical disruptions will be promptly communicated to you by our WhatsApp concierge.
        </p>

        <h3 className="font-serif text-lg text-vantaire-warmWhite">4. Product Specifications & Photography</h3>
        <p>
          We strive to represent colors and frame finishes with absolute photographic fidelity. Due to variations across consumer mobile and desktop display calibrations, slight optical nuances in tint reflection may naturally exist.
        </p>
      </div>
    </div>
  );
}