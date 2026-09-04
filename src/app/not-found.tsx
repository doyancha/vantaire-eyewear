import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { siteConfig } from "@/lib/config";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { buildGeneralWhatsAppUrl } from "@/lib/whatsapp";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-20 px-4 text-center">
      <div className="max-w-md mx-auto space-y-6">
        <span className="text-xs uppercase tracking-luxury text-vantaire-champagne font-semibold block">
          404 • Silhouette Not Located
        </span>
        <h1 className="font-serif text-4xl sm:text-5xl text-vantaire-warmWhite font-normal">
          Lost in Shadow.
        </h1>
        <p className="text-xs sm:text-sm text-vantaire-muted font-sans leading-relaxed">
          The eyewear model or page you requested cannot be found or has been retired from the active atelier archive.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-vantaire-warmWhite hover:bg-vantaire-sand text-vantaire-black text-xs uppercase tracking-luxury font-semibold transition-all"
          >
            <span>Explore All Sunglasses</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <WhatsAppButton
            href={buildGeneralWhatsAppUrl("Hello VANTAIRE, I am searching for a specific sunglasses model.")}
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
          >
            Ask Concierge
          </WhatsAppButton>
        </div>
      </div>
    </div>
  );
}