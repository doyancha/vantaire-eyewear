import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";
import { siteConfig } from "@/lib/config";
import { MessageCircle, ShieldCheck, Truck, RefreshCw, Sparkles } from "lucide-react";
import { buildGeneralWhatsAppUrl } from "@/lib/whatsapp";

export function Footer() {
  return (
    <footer className="bg-vantaire-black border-t border-vantaire-border text-vantaire-muted">
      {/* Brand Trust Strip */}
      <div className="border-b border-vantaire-border/60 py-10 bg-vantaire-charcoal/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-vantaire-champagne flex-shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">Sun Tint Optics</p>
              <p className="text-[11px] text-vantaire-muted mt-0.5">Curated solar glare reduction & visual comfort</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <Sparkles className="w-6 h-6 text-vantaire-champagne flex-shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">Curated Silhouettes</p>
              <p className="text-[11px] text-vantaire-muted mt-0.5">Distinctive frame shapes with clean modern lines</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <Truck className="w-6 h-6 text-vantaire-champagne flex-shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">Nationwide Delivery</p>
              <p className="text-[11px] text-vantaire-muted mt-0.5">{siteConfig.delivery.insideDhakaTime} in Dhaka • {siteConfig.delivery.outsideDhakaTime} nationwide</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <RefreshCw className="w-6 h-6 text-vantaire-champagne flex-shrink-0" />
            <div>
              <p className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">WhatsApp Concierge</p>
              <p className="text-[11px] text-vantaire-muted mt-0.5">Style consultation and direct order confirmation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* Brand Column */}
        <div className="lg:col-span-2 space-y-4">
          <Wordmark />
          <p className="text-xs text-vantaire-muted tracking-wide max-w-sm leading-relaxed mt-4">
            {siteConfig.subTagline} Built for confident presence under the sun. All orders confirmed directly with our dedicated concierge on WhatsApp.
          </p>
          <div className="pt-2">
            <a
              href={buildGeneralWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp: {siteConfig.whatsapp.displayNumber}</span>
            </a>
          </div>
        </div>

        {/* Shop Navigation */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">
            Collections
          </p>
          <ul className="space-y-2 text-xs text-vantaire-sand">
            <li>
              <Link href="/shop" className="hover:text-vantaire-champagne transition-colors">
                All Sunglasses
              </Link>
            </li>
            <li>
              <Link href="/collections/aviator" className="hover:text-vantaire-champagne transition-colors">
                Aviator Silhouette
              </Link>
            </li>
            <li>
              <Link href="/collections/square" className="hover:text-vantaire-champagne transition-colors">
                Sculpted Square
              </Link>
            </li>
            <li>
              <Link href="/collections/round" className="hover:text-vantaire-champagne transition-colors">
                Pantoscopic Round
              </Link>
            </li>
            <li>
              <Link href="/collections/cat-eye" className="hover:text-vantaire-champagne transition-colors">
                Verona Cat-Eye
              </Link>
            </li>
            <li>
              <Link href="/collections/polarized" className="hover:text-vantaire-champagne transition-colors">
                Polarized Optics
              </Link>
            </li>
            <li>
              <Link href="/collections/sport" className="hover:text-vantaire-champagne transition-colors">
                Velocity Sport
              </Link>
            </li>
          </ul>
        </div>

        {/* Company & Brand */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">
            The House
          </p>
          <ul className="space-y-2 text-xs text-vantaire-sand">
            <li>
              <Link href="/about" className="hover:text-vantaire-champagne transition-colors">
                About VANTAIRE
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-vantaire-champagne transition-colors">
                Client Concierge
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-vantaire-champagne transition-colors">
                Ordering & WhatsApp FAQ
              </Link>
            </li>
            <li>
              <Link href="/shipping" className="hover:text-vantaire-champagne transition-colors">
                Shipping & Delivery
              </Link>
            </li>
            <li>
              <Link href="/returns" className="hover:text-vantaire-champagne transition-colors">
                Exchanges & Guarantee
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal & Policies */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-luxury text-vantaire-warmWhite font-semibold">
            Information
          </p>
          <ul className="space-y-2 text-xs text-vantaire-sand">
            <li>
              <Link href="/privacy" className="hover:text-vantaire-champagne transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-vantaire-champagne transition-colors">
                Terms of Service
              </Link>
            </li>
            <li className="pt-2 text-[11px] text-vantaire-muted leading-relaxed">
              Concierge Hours:<br />
              {siteConfig.contact.hours}
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal bar */}
      <div className="border-t border-vantaire-border/60 py-6 text-[11px] text-vantaire-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © {new Date().getFullYear()} {siteConfig.brandName}. Demonstration Storefront.
          </p>
          <p className="text-center sm:text-right">
            “{siteConfig.tagline}” • Direct WhatsApp Commerce
          </p>
        </div>
      </div>
    </footer>
  );
}