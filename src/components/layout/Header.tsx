"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/ui/Wordmark";
import { Menu, X, MessageCircle, ChevronDown } from "lucide-react";
import { buildGeneralWhatsAppUrl } from "@/lib/whatsapp";
import { COLLECTIONS_META } from "@/data/products";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: "All Sunglasses", href: "/shop" },
    { label: "Collections", href: "/collections", hasDropdown: true },
    { label: "Polarized", href: "/collections/polarized" },
    { label: "About", href: "/about" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-vantaire-black/95 backdrop-blur-md border-b border-vantaire-border py-3.5 shadow-xl shadow-black/40"
          : "bg-vantaire-black/80 backdrop-blur-sm border-b border-vantaire-border/40 py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden p-2 text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors focus:outline-none"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Brand Wordmark */}
        <div className="flex-1 lg:flex-none text-center lg:text-left">
          <Wordmark />
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-8 text-xs uppercase tracking-luxury font-medium text-vantaire-sand" aria-label="Main Navigation">
          {navLinks.map((link) => {
            if (link.hasDropdown) {
              return (
                <div
                  key={link.label}
                  className="relative group py-2"
                  onMouseEnter={() => setCollectionsOpen(true)}
                  onMouseLeave={() => setCollectionsOpen(false)}
                >
                  <Link
                    href={link.href}
                    className={`inline-flex items-center gap-1 transition-colors hover:text-vantaire-champagne ${
                      pathname.startsWith("/collections") ? "text-vantaire-champagne font-semibold" : ""
                    }`}
                  >
                    <span>{link.label}</span>
                    <ChevronDown className="w-3.5 h-3.5 transition-transform group-hover:rotate-180" />
                  </Link>

                  {/* Dropdown Menu */}
                  <div
                    className={`absolute top-full left-0 w-64 bg-vantaire-charcoal/95 backdrop-blur-md border border-vantaire-border shadow-2xl py-3 px-2 rounded-none transition-all duration-200 ${
                      collectionsOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
                    }`}
                  >
                    <div className="text-[10px] tracking-widest text-vantaire-muted uppercase px-3 py-1 font-semibold">
                      Curated Editions
                    </div>
                    {COLLECTIONS_META.map((col) => (
                      <Link
                        key={col.slug}
                        href={`/collections/${col.slug}`}
                        className="block px-3 py-2 text-xs tracking-wider text-vantaire-sand hover:text-vantaire-champagne hover:bg-vantaire-darkGray/60 transition-colors"
                      >
                        {col.name}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={link.label}
                href={link.href}
                className={`transition-colors hover:text-vantaire-champagne py-2 ${
                  pathname === link.href ? "text-vantaire-champagne font-semibold" : ""
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* WhatsApp Direct Concierge CTA */}
        <div className="flex items-center space-x-4">
          <a
            href={buildGeneralWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 text-xs uppercase tracking-wider bg-emerald-600/90 hover:bg-emerald-500 text-white px-4 py-2.5 transition-all shadow-sm active:scale-95 border border-emerald-500/40"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="font-medium">WhatsApp Concierge</span>
          </a>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <div
        className={`fixed inset-x-0 top-[73px] bottom-0 bg-vantaire-black/98 backdrop-blur-lg z-40 lg:hidden transition-transform duration-300 ease-in-out border-t border-vantaire-border px-6 py-8 flex flex-col justify-between overflow-y-auto ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          <div className="text-[11px] tracking-widest text-vantaire-muted uppercase pb-2 border-b border-vantaire-border/40">
            Navigation
          </div>
          <div className="flex flex-col space-y-4 text-sm tracking-luxury uppercase font-medium">
            <Link
              href="/shop"
              onClick={() => setIsOpen(false)}
              className="text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors py-1"
            >
              All Sunglasses
            </Link>
            <Link
              href="/collections"
              onClick={() => setIsOpen(false)}
              className="text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors py-1"
            >
              All Collections
            </Link>
            
            {/* Nested collection links for mobile */}
            <div className="pl-4 space-y-2 border-l border-vantaire-border/50 my-2 text-xs tracking-wider normal-case text-vantaire-sand">
              {COLLECTIONS_META.map((col) => (
                <Link
                  key={col.slug}
                  href={`/collections/${col.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="block hover:text-vantaire-champagne py-1"
                >
                  {col.name}
                </Link>
              ))}
            </div>

            <Link
              href="/about"
              onClick={() => setIsOpen(false)}
              className="text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors py-1"
            >
              About VANTAIRE
            </Link>
            <Link
              href="/faq"
              onClick={() => setIsOpen(false)}
              className="text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors py-1"
            >
              Ordering FAQ
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsOpen(false)}
              className="text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors py-1"
            >
              Contact & Support
            </Link>
          </div>
        </div>

        <div className="pt-8 border-t border-vantaire-border/60 space-y-4">
          <a
            href={buildGeneralWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2.5 text-xs uppercase tracking-luxury bg-emerald-600 hover:bg-emerald-500 text-white py-4 font-semibold shadow-lg shadow-emerald-950/50"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Order Directly on WhatsApp</span>
          </a>
          <p className="text-center text-[11px] text-vantaire-muted">
            Nationwide Delivery across Bangladesh • Cash on Delivery
          </p>
        </div>
      </div>
    </header>
  );
}
