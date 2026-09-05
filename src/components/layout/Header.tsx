"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuCloseBtnRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  // Close menu helper
  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Track scroll for sticky header elevation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  // Responsive breakpoint reset: auto-close mobile drawer when window expands to desktop (lg = 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        closeMenu();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [closeMenu]);

  // Escape key handler & Body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    // Body scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus close button on open if available
    const timer = setTimeout(() => {
      menuCloseBtnRef.current?.focus();
    }, 50);

    // Escape key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
        menuTriggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeMenu]);

  const navLinks = [
    { label: "All Sunglasses", href: "/shop" },
    { label: "Collections", href: "/collections", hasDropdown: true },
    { label: "The Sun-Tint Series", href: "/collections/polarized" },
    { label: "About", href: "/about" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? "bg-vantaire-black/95 backdrop-blur-md border-b border-vantaire-border py-3.5 shadow-xl shadow-black/40"
            : "bg-vantaire-black/80 backdrop-blur-sm border-b border-vantaire-border/40 py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Mobile menu trigger */}
          <button
            ref={menuTriggerRef}
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="lg:hidden p-2 text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-vantaire-champagne"
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation-menu"
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
                        pathname.startsWith("/collections") && pathname !== "/collections/polarized" ? "text-vantaire-champagne font-semibold" : ""
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
      </header>

      {/* Mobile Navigation Drawer & Backdrop Layer */}
      <div
        id="mobile-navigation-menu"
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
      >
        {/* Backdrop (Clicking outside panel triggers close) */}
        <div
          data-testid="mobile-menu-backdrop"
          className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={closeMenu}
          aria-hidden="true"
        />

        {/* Slide-out Menu Panel (Clicking inside does NOT close) */}
        <div
          ref={menuPanelRef}
          data-testid="mobile-menu-panel"
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-sm h-full bg-vantaire-black/98 border-r border-vantaire-border/80 shadow-2xl flex flex-col justify-between overflow-y-auto px-6 py-6 transition-transform duration-300 ease-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header row inside panel */}
          <div className="flex items-center justify-between pb-4 border-b border-vantaire-border/50">
            <Wordmark />
            <button
              ref={menuCloseBtnRef}
              data-testid="mobile-menu-close-button"
              type="button"
              onClick={closeMenu}
              className="p-2 -mr-2 text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-vantaire-champagne"
              aria-label="Close navigation menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Links Area */}
          <div className="py-6 space-y-6 flex-1">
            <div className="text-[11px] tracking-widest text-vantaire-muted uppercase font-semibold">
              Navigation
            </div>
            <div className="flex flex-col space-y-4 text-sm tracking-luxury uppercase font-medium">
              <Link
                href="/shop"
                onClick={closeMenu}
                className="text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors py-1.5"
              >
                All Sunglasses
              </Link>
              <Link
                href="/collections"
                onClick={closeMenu}
                className="text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors py-1.5"
              >
                All Collections
              </Link>

              {/* Nested collection links for mobile */}
              <div className="pl-4 space-y-2.5 border-l border-vantaire-border/50 my-2 text-xs tracking-wider normal-case text-vantaire-sand">
                {COLLECTIONS_META.map((col) => (
                  <Link
                    key={col.slug}
                    href={`/collections/${col.slug}`}
                    onClick={closeMenu}
                    className="block hover:text-vantaire-champagne py-1"
                  >
                    {col.name}
                  </Link>
                ))}
              </div>

              <Link
                href="/about"
                onClick={closeMenu}
                className="text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors py-1.5"
              >
                About VANTAIRE
              </Link>
              <Link
                href="/faq"
                onClick={closeMenu}
                className="text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors py-1.5"
              >
                Ordering FAQ
              </Link>
              <Link
                href="/contact"
                onClick={closeMenu}
                className="text-vantaire-warmWhite hover:text-vantaire-champagne transition-colors py-1.5"
              >
                Contact & Support
              </Link>
            </div>
          </div>

          {/* Bottom Concierge / Actions Bar */}
          <div className="pt-6 border-t border-vantaire-border/60 space-y-3">
            <a
              href={buildGeneralWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 text-xs uppercase tracking-luxury bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 font-semibold shadow-lg shadow-emerald-950/50"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Concierge</span>
            </a>
            <p className="text-center text-[10px] text-vantaire-muted">
              Nationwide Delivery across Bangladesh • Cash on Delivery
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
