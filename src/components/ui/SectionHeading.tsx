import React from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  centered = true,
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={`space-y-3 mb-12 md:mb-16 ${centered ? "text-center max-w-3xl mx-auto" : "max-w-2xl"} ${className}`}>
      {eyebrow && (
        <span className="text-[10px] md:text-xs tracking-[0.25em] uppercase text-vantaire-champagne font-semibold block">
          {eyebrow}
        </span>
      )}
      <h2 className="text-2xl md:text-4xl lg:text-5xl font-serif tracking-tight text-vantaire-warmWhite font-normal leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs md:text-sm text-vantaire-muted leading-relaxed font-sans max-w-xl mx-auto">
          {subtitle}
        </p>
      )}
      <div className={`w-12 h-[1px] bg-vantaire-champagne/40 pt-1 ${centered ? "mx-auto" : ""}`} />
    </div>
  );
}
