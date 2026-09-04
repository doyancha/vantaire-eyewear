import Link from "next/link";
import { siteConfig } from "@/lib/config";

export function AnnouncementBar() {
  return (
    <div className="bg-vantaire-black border-b border-vantaire-border/60 text-xs py-2 px-4 text-center tracking-subtle uppercase text-vantaire-sand">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <span className="hidden md:inline-block text-[11px] text-vantaire-muted">
          Eyewear Collection • Nationwide Bangladesh Dispatch
        </span>
        <span className="mx-auto md:mx-0 font-medium text-vantaire-warmWhite flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-vantaire-champagne animate-pulse"></span>
          Direct WhatsApp Ordering • Cash on Delivery Available
        </span>
        <div className="hidden md:flex items-center gap-4 text-[11px] text-vantaire-muted">
          <span>Inside Dhaka: ৳{siteConfig.delivery.feeInsideDhaka}</span>
          <span>•</span>
          <Link href="/faq" className="hover:text-vantaire-champagne transition-colors">
            Ordering FAQ
          </Link>
        </div>
      </div>
    </div>
  );
}