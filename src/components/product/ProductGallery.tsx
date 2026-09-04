"use client";

import { useState } from "react";
import Image from "next/image";

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      {/* Large Main Showcase Image */}
      <div className="relative aspect-square sm:aspect-[4/3] md:aspect-square w-full bg-vantaire-charcoal overflow-hidden border border-vantaire-border/80">
        <Image
          src={images[selectedIndex] || images[0]}
          alt={`${productName} view ${selectedIndex + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover object-center transition-all duration-500 ease-in-out"
        />
      </div>

      {/* Thumbnails Row */}
      {images.length > 1 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`relative aspect-square w-full overflow-hidden border transition-all duration-200 ${
                selectedIndex === idx
                  ? "border-vantaire-champagne ring-1 ring-vantaire-champagne/50"
                  : "border-vantaire-border/60 hover:border-vantaire-sand opacity-70 hover:opacity-100"
              }`}
              aria-label={`Select angle ${idx + 1} for ${productName}`}
            >
              <Image
                src={img}
                alt={`${productName} thumbnail ${idx + 1}`}
                fill
                sizes="120px"
                className="object-cover object-center"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
