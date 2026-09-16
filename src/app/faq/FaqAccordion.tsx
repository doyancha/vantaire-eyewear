"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      {items.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <div
            key={idx}
            className="bg-vantaire-charcoal/40 border border-vantaire-border/80 transition-colors duration-200"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="w-full text-left p-5 flex items-center justify-between gap-4 focus:outline-none"
              aria-expanded={isOpen}
            >
              <span className="font-serif text-base sm:text-lg text-vantaire-warmWhite">
                {faq.q}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-vantaire-champagne transition-transform duration-200 flex-shrink-0 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isOpen && (
              <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-vantaire-sand/90 font-sans leading-relaxed border-t border-vantaire-border/40">
                {faq.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
