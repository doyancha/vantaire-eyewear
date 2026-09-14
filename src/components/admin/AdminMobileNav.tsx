"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  ExternalLink,
  Glasses,
  Layers,
  Image as ImageIcon,
  Sparkles,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { logoutAction } from "@/app/admin/login/actions";

interface AdminMobileNavProps {
  userEmail: string;
  displayName: string;
  role: string;
}

export function AdminMobileNav({
  userEmail,
  displayName,
  role,
}: AdminMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Handle Escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const navItems = [
    {
      name: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
      enabled: true,
    },
    {
      name: "Products",
      href: "/admin/products",
      icon: Glasses,
      active: pathname.startsWith("/admin/products"),
      enabled: true,
    },
    {
      name: "Collections",
      href: "#",
      icon: Layers,
      active: false,
      enabled: false,
      badge: "Phase 8",
    },
    {
      name: "Media Library",
      href: "/admin/media",
      icon: ImageIcon,
      active: pathname.startsWith("/admin/media"),
      enabled: true,
    },
    {
      name: "Merchandising",
      href: "#",
      icon: Sparkles,
      active: false,
      enabled: false,
      badge: "Phase 10",
    },
    {
      name: "Site Settings",
      href: "#",
      icon: Settings,
      active: false,
      enabled: false,
      badge: "Phase 11",
    },
  ];

  return (
    <div className="lg:hidden">
      {/* Mobile Drawer Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-label="Open admin navigation"
        aria-expanded={isOpen}
        aria-controls="admin-mobile-drawer"
        className="p-2 text-vantaire-sand hover:text-vantaire-warmWhite focus:outline-none focus:ring-1 focus:ring-vantaire-champagne transition-colors"
      >
        <Menu className="w-5 h-5" aria-hidden="true" />
      </button>

      {/* Drawer Overlay & Content */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity motion-reduce:transition-none"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            id="admin-mobile-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin Navigation"
            className="relative flex flex-col w-4/5 max-w-xs bg-vantaire-charcoal border-r border-vantaire-border text-vantaire-warmWhite z-10 h-full shadow-2xl animate-in slide-in-from-left duration-200 motion-reduce:animate-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-vantaire-border/60">
              <div>
                <span className="font-serif text-lg tracking-wider text-vantaire-warmWhite font-semibold">
                  VANTAIRE
                </span>
                <p className="text-[10px] uppercase tracking-luxury text-vantaire-champagne">
                  Admin CMS
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close admin navigation"
                className="p-2 text-vantaire-muted hover:text-vantaire-warmWhite focus:outline-none focus:ring-1 focus:ring-vantaire-champagne transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Navigation List */}
            <nav aria-label="Admin Mobile Navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                if (item.enabled) {
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleClose}
                      aria-current={item.active ? "page" : undefined}
                      className={`flex items-center justify-between px-3 py-2.5 text-xs font-medium transition-colors ${
                        item.active
                          ? "bg-vantaire-champagne/15 text-vantaire-champagne border-l-2 border-vantaire-champagne"
                          : "text-vantaire-sand hover:text-vantaire-warmWhite hover:bg-vantaire-black/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" aria-hidden="true" />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  );
                }

                return (
                  <div
                    key={item.name}
                    aria-disabled="true"
                    className="flex items-center justify-between px-3 py-2.5 text-xs font-medium text-vantaire-muted cursor-not-allowed opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] uppercase tracking-wider font-mono px-1.5 py-0.5 bg-vantaire-black/60 border border-vantaire-border/40 text-vantaire-muted">
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              })}

              <div className="pt-4 mt-4 border-t border-vantaire-border/40">
                <Link
                  href="/"
                  onClick={handleClose}
                  className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-vantaire-sand hover:text-vantaire-warmWhite hover:bg-vantaire-black/40 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  <span>View Storefront</span>
                </Link>
              </div>
            </nav>

            {/* User & Logout Footer */}
            <div className="p-4 border-t border-vantaire-border/60 bg-vantaire-black/30 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-vantaire-charcoal border border-vantaire-border flex items-center justify-center text-vantaire-champagne flex-shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-vantaire-warmWhite truncate">
                    {displayName || userEmail}
                  </p>
                  <span className="inline-block text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.2 bg-vantaire-champagne/15 text-vantaire-champagne border border-vantaire-champagne/30 mt-0.5">
                    {role.toUpperCase()}
                  </span>
                </div>
              </div>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs uppercase tracking-luxury text-vantaire-sand hover:text-vantaire-warmWhite border border-vantaire-border hover:border-vantaire-champagne/60 bg-vantaire-black/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
