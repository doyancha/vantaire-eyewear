import Link from "next/link";
import { siteConfig } from "@/lib/config";

export function Wordmark({ className = "", light = false }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={`group inline-flex flex-col items-center tracking-luxury text-center ${className}`}>
      <span className={`text-xl md:text-2xl font-serif font-bold tracking-[0.25em] transition-colors duration-300 ${
        light ? "text-vantaire-black group-hover:text-vantaire-champagne" : "text-vantaire-warmWhite group-hover:text-vantaire-champagne"
      }`}>
        {siteConfig.brandShort}
      </span>
      <span className={`text-[9px] uppercase tracking-[0.45em] font-sans ${
        light ? "text-neutral-500" : "text-vantaire-muted"
      }`}>
        EYEWEAR
      </span>
    </Link>
  );
}
