import { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy and customer data handling policy for VANTAIRE EYEWEAR.",
};

export default function PrivacyPage() {
  return (
    <div className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Information Security"
        title="Privacy Policy"
        subtitle="How VANTAIRE handles your contact details and communication confidentiality."
      />

      <div className="space-y-6 text-xs sm:text-sm text-vantaire-sand/90 font-sans leading-relaxed bg-vantaire-charcoal/30 border border-vantaire-border/80 p-6 sm:p-8">
        <p>Last updated: September 2026</p>

        <h3 className="font-serif text-lg text-vantaire-warmWhite">1. Client Data Collection</h3>
        <p>
          At {siteConfig.brandName}, we respect your personal privacy. Because all orders are completed through direct WhatsApp interaction, we only collect essential delivery details: your recipient name, delivery contact phone number, and physical mailing address necessary to hand over to our courier partner.
        </p>

        <h3 className="font-serif text-lg text-vantaire-warmWhite">2. No Online Financial Storage</h3>
        <p>
          We do not operate a traditional online payment gateway database on this website. We never request or store credit card numbers, debit card details, or banking passwords on our servers.
        </p>

        <h3 className="font-serif text-lg text-vantaire-warmWhite">3. WhatsApp Communication</h3>
        <p>
          Your conversation with our concierge occurs on the WhatsApp platform and is protected by WhatsApp’s standard end-to-end encryption protocols. We never sell, rent, or share your contact numbers with third-party telemarketing companies.
        </p>

        <h3 className="font-serif text-lg text-vantaire-warmWhite">4. Inquiries & Corrections</h3>
        <p>
          If you wish to update or delete your delivery record from our order registry after completing an order, please message our concierge at {siteConfig.contact.email} or directly via WhatsApp.
        </p>
      </div>
    </div>
  );
}