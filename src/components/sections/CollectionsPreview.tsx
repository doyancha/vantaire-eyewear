import Link from "next/link";
import Image from "next/image";
import { COLLECTIONS_META } from "@/data/products";
import { ArrowUpRight } from "lucide-react";

export function CollectionsPreview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {COLLECTIONS_META.map((col) => (
        <Link
          key={col.slug}
          href={`/collections/${col.slug}`}
          className="group relative h-80 overflow-hidden bg-vantaire-charcoal border border-vantaire-border/60 hover:border-vantaire-champagne/60 transition-all duration-300 flex flex-col justify-end p-6"
        >
          {/* Background image */}
          <Image
            src={col.coverImage}
            alt={col.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover object-center opacity-60 group-hover:opacity-75 group-hover:scale-105 transition-all duration-700 ease-out"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-vantaire-black via-vantaire-black/40 to-transparent" />

          {/* Content */}
          <div className="relative z-10 space-y-1.5">
            <span className="text-[10px] uppercase tracking-luxury text-vantaire-champagne font-semibold block">
              {col.tagline}
            </span>
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl text-vantaire-warmWhite font-normal group-hover:text-vantaire-champagne transition-colors">
                {col.name}
              </h3>
              <div className="w-8 h-8 rounded-full bg-vantaire-black/70 border border-vantaire-border/80 flex items-center justify-center text-vantaire-sand group-hover:text-vantaire-champagne group-hover:border-vantaire-champagne transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs text-vantaire-muted line-clamp-2 pt-1 font-sans">
              {col.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
