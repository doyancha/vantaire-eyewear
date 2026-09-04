import { Metadata } from "next";
import { COLLECTIONS_META } from "@/data/products";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CollectionsPreview } from "@/components/sections/CollectionsPreview";

export const metadata: Metadata = {
  title: "Eyewear Collections & Silhouettes",
  description: "Browse curated sunglasses collections from VANTAIRE: Aviator, Sculpted Square, Pantoscopic Round, Verona Cat-Eye, and Polarized Optics.",
};

export default function CollectionsPage() {
  return (
    <div className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Curated Editions"
        title="Eyewear Collections"
        subtitle="Distinctive frame forms tailored for presence, geometry, and enduring optical excellence."
      />

      <CollectionsPreview />
    </div>
  );
}