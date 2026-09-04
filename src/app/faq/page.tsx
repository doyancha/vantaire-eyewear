"use client";

import { useState } from "react";
import { siteConfig } from "@/lib/config";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { buildGeneralWhatsAppUrl } from "@/lib/whatsapp";
import { ChevronDown } from "lucide-react";

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does ordering on WhatsApp work?",
      a: "Ordering is direct and straightforward. When viewing any sunglasses on our website, click 'Order on WhatsApp'. This automatically opens WhatsApp with a pre-filled message detailing the model name, frame color, lens specifications, price, and product URL. Send the message to our concierge, who will confirm availability, answer any styling questions, take your delivery address, and coordinate shipment."
    },
    {
      q: "Is Cash on Delivery (COD) available?",
      a: "Yes, Cash on Delivery is available for deliveries across Bangladesh. Advance payment may be requested for selected orders or remote delivery locations only. You can also pay via bKash/Nagad upon coordination with our concierge."
    },
    {
      q: "What are the delivery charges and estimated times?",
      a: `Inside Dhaka: Estimated delivery takes ${siteConfig.delivery.insideDhakaTime} with a delivery fee of ${siteConfig.delivery.currencySymbol}${siteConfig.delivery.feeInsideDhaka}. Outside Dhaka (Nationwide): Estimated delivery takes ${siteConfig.delivery.outsideDhakaTime} with a delivery fee of ${siteConfig.delivery.currencySymbol}${siteConfig.delivery.feeOutsideDhaka}.`
    },
    {
      q: "Are VANTAIRE sunglasses UV-protective and polarized?",
      a: "Our sunglasses feature dark sun-tint and gradient-tint lenses designed for outdoor solar glare comfort. For specific technical laboratory UV ratings or polarized filter specifications on individual models, please inquire directly with our concierge on WhatsApp prior to ordering."
    },
    {
      q: "What is your exchange policy if the frame does not fit?",
      a: "If the frame silhouette does not complement your face shape, you may request a size or model exchange by contacting us promptly via WhatsApp after delivery. The product must remain completely unused and in pristine condition with all original packaging accessories retained. Delivery charges for preference-based exchanges are payable by the customer."
    },
    {
      q: "What happens if a product arrives damaged or incorrect?",
      a: "If your parcel arrives damaged or contains an incorrect model, please message our WhatsApp concierge as soon as possible with a photograph or unboxing video. Our team will review the issue and arrange an appropriate replacement."
    },
    {
      q: "What comes inside the package with my sunglasses?",
      a: `Every pair is delivered with our ${siteConfig.delivery.packaging}`
    },
    {
      q: "Can I request live photos of the sunglasses before ordering?",
      a: "Yes. Since all communication happens directly via WhatsApp, you can ask our concierge for additional photos or video angles of any frame model before finalizing your order."
    }
  ];

  return (
    <div className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Direct Concierge Support"
        title="Frequently Asked Questions"
        subtitle="Clear answers regarding our WhatsApp ordering process, optics, and nationwide delivery."
      />

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="bg-vantaire-charcoal/40 border border-vantaire-border/80 transition-colors duration-200"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full text-left p-5 flex items-center justify-between gap-4 focus:outline-none"
                aria-expanded={isOpen}
              >
                <span className="font-serif text-base sm:text-lg text-vantaire-warmWhite">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-vantaire-champagne transition-transform duration-200 flex-shrink-0 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-vantaire-sand/90 font-sans leading-relaxed border-t border-vantaire-border/40">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-16 text-center bg-vantaire-charcoal/30 border border-vantaire-border p-8 space-y-4">
        <h3 className="font-serif text-xl text-vantaire-warmWhite">Have a question not listed here?</h3>
        <p className="text-xs text-vantaire-muted max-w-md mx-auto">
          Our team is available Saturday through Thursday on WhatsApp to answer any questions or check stock immediately.
        </p>
        <WhatsAppButton
          href={buildGeneralWhatsAppUrl()}
          size="md"
          variant="secondary"
        >
          Message Concierge on WhatsApp
        </WhatsAppButton>
      </div>
    </div>
  );
}