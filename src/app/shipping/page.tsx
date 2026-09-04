import { Metadata } from "next";
import { siteConfig } from "@/lib/config";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Truck, Clock, ShieldCheck, MapPin, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Shipping & Delivery Information",
  description: "Learn about VANTAIRE EYEWEAR delivery timelines, charges, and packaging standards across Bangladesh.",
};

export default function ShippingPage() {
  return (
    <div className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Nationwide Logistics"
        title="Shipping & Delivery"
        subtitle="Transparent fulfillment across all 64 districts in Bangladesh with protective packaging."
      />

      <div className="space-y-8 text-sm text-vantaire-sand/90 font-sans leading-relaxed">
        {/* Delivery Schedule Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-vantaire-charcoal/50 border border-vantaire-border/80 p-6 space-y-3">
            <div className="flex items-center gap-2 text-vantaire-champagne">
              <Truck className="w-5 h-5" />
              <h3 className="font-serif text-lg text-vantaire-warmWhite">Inside Dhaka</h3>
            </div>
            <p className="text-xs text-vantaire-muted">
              Door-to-door express courier dispatch within Dhaka metro.
            </p>
            <div className="pt-2 border-t border-vantaire-border/50 text-xs space-y-1.5">
              <p><strong>Estimated Time:</strong> {siteConfig.delivery.insideDhakaTime}</p>
              <p><strong>Delivery Charge:</strong> ৳{siteConfig.delivery.feeInsideDhaka}</p>
              <p><strong>Payment:</strong> Cash on Delivery (COD)</p>
            </div>
          </div>

          <div className="bg-vantaire-charcoal/50 border border-vantaire-border/80 p-6 space-y-3">
            <div className="flex items-center gap-2 text-vantaire-champagne">
              <MapPin className="w-5 h-5" />
              <h3 className="font-serif text-lg text-vantaire-warmWhite">Outside Dhaka (Nationwide)</h3>
            </div>
            <p className="text-xs text-vantaire-muted">
              Reliable delivery covering all 64 districts via registered express courier.
            </p>
            <div className="pt-2 border-t border-vantaire-border/50 text-xs space-y-1.5">
              <p><strong>Estimated Time:</strong> {siteConfig.delivery.outsideDhakaTime}</p>
              <p><strong>Delivery Charge:</strong> ৳{siteConfig.delivery.feeOutsideDhaka}</p>
              <p><strong>Payment:</strong> Cash on Delivery (COD)</p>
            </div>
          </div>
        </div>

        {/* Payment & Terms Note */}
        <div className="bg-vantaire-charcoal/40 border border-vantaire-border/80 p-5 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-vantaire-champagne font-semibold uppercase tracking-wider">
            <AlertCircle className="w-4 h-4" />
            <span>Payment & Delivery Guidelines</span>
          </div>
          <p className="text-vantaire-sand/90 leading-relaxed">
            • Cash on Delivery (COD) is available across Bangladesh.<br />
            • Advance payment may be requested for selected orders or remote delivery locations only.<br />
            • All delivery timelines are reasonable estimates; adverse weather, regional holidays, or courier disruptions may cause slight logistical delays.
          </p>
        </div>

        {/* Packaging Standards */}
        <div className="bg-vantaire-charcoal/30 border border-vantaire-border/70 p-6 space-y-3">
          <div className="flex items-center gap-2 text-vantaire-champagne">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="font-serif text-xl text-vantaire-warmWhite">Protective Packaging Standard</h3>
          </div>
          <p className="text-xs text-vantaire-muted leading-relaxed">
            Every shipment undergoes careful visual inspection before boxing. Sunglasses are nested securely inside our rigid protective hard case and packed inside cushioned outer mailers to prevent transit damage.
          </p>
        </div>
      </div>
    </div>
  );
}