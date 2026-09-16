import { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { buildGeneralWhatsAppUrl } from "@/lib/whatsapp";
import { getSiteSettings } from "@/lib/data/storefront";
import { FaqAccordion } from "./FaqAccordion";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Clear answers regarding our WhatsApp ordering process, optics, and nationwide delivery.",
};

export default async function FaqPage() {
  const settings = await getSiteSettings();
  const delivery = settings?.delivery || siteConfig.delivery;
  const whatsappUrl = buildGeneralWhatsAppUrl(undefined, settings);

  const faqs = [
    {
      q: "How does ordering on WhatsApp work?",
      a: "Ordering is direct and straightforward. When viewing any sunglasses on our website, click 'Order on WhatsApp'. This automatically opens WhatsApp with a pre-filled message detailing the model name, frame color, lens specifications, price, and product URL. Send the message to our concierge, who will confirm availability, answer any styling questions, take your delivery address, and coordinate shipment."
    },
    {
      q: "Is Cash on Delivery (COD) available?",
      a: delivery.cashOnDelivery
        ? "Yes, Cash on Delivery is available for deliveries across Bangladesh. Advance payment may be requested for selected orders or remote delivery locations only. You can also pay via bKash/Nagad upon coordination with our concierge."
        : "Advance payment is currently required for order confirmation and dispatch across Bangladesh. You can coordinate your payment directly with our concierge on WhatsApp."
    },
    {
      q: "What are the delivery charges and estimated times?",
      a: `Inside Dhaka: Estimated delivery takes ${delivery.insideDhakaTime} with a delivery fee of ${delivery.currencySymbol}${delivery.feeInsideDhaka}. Outside Dhaka (Nationwide): Estimated delivery takes ${delivery.outsideDhakaTime} with a delivery fee of ${delivery.currencySymbol}${delivery.feeOutsideDhaka}.`
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
      a: `Every pair is delivered with our ${delivery.packaging}`
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

      <FaqAccordion items={faqs} />

      <div className="mt-16 text-center bg-vantaire-charcoal/30 border border-vantaire-border p-8 space-y-4">
        <h3 className="font-serif text-xl text-vantaire-warmWhite">Have a question not listed here?</h3>
        <p className="text-xs text-vantaire-muted max-w-md mx-auto">
          Our team is available Saturday through Thursday on WhatsApp to answer any questions or check stock immediately.
        </p>
        <WhatsAppButton
          href={whatsappUrl}
          size="md"
          variant="secondary"
        >
          Message Concierge on WhatsApp
        </WhatsAppButton>
      </div>
    </div>
  );
}