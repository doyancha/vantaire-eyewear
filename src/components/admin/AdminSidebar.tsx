"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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

interface AdminSidebarProps {
  userEmail: string;
  displayName: string;
  role: string;
}

export function AdminSidebar({
  userEmail,
  displayName,
  role,
}: AdminSidebarProps) {
  const pathname = usePathname();

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
      href: "/admin/collections",
      icon: Layers,
      active: pathname.startsWith("/admin/collections"),
      enabled: true,
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
      href: "/admin/merchandising",
      icon: Sparkles,
      active: pathname.startsWith("/admin/merchandising"),
      enabled: true,
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
    <aside className="hidden lg:flex flex-col w-64 bg-vantaire-charcoal/95 border-r border-vantaire-border/80 min-h-screen text-vantaire-warmWhite select-none">
      {/* Brand & Context */}
      <div className="p-6 border-b border-vantaire-border/60">
        <div className="flex items-center justify-between">
          <span className="font-serif text-xl tracking-wider text-vantaire-warmWhite font-semibold">
            VANTAIRE
          </span>
          <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20">
            LOCAL
          </span>
        </div>
        <p className="text-[11px] uppercase tracking-luxury text-vantaire-champagne mt-1">
          Admin Backoffice
        </p>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Admin Desktop Navigation" className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.enabled) {
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={`flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-none transition-colors ${
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

          // Disabled roadmapped nav item
          return (
            <div
              key={item.name}
              aria-disabled="true"
              className="flex items-center justify-between px-3 py-2.5 text-xs font-medium text-vantaire-muted cursor-not-allowed select-none opacity-60"
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
            className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-vantaire-sand hover:text-vantaire-warmWhite hover:bg-vantaire-black/40 transition-colors"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            <span>View Storefront</span>
          </Link>
        </div>
      </nav>

      {/* User Identity & Logout Footer */}
      <div className="p-4 border-t border-vantaire-border/60 bg-vantaire-black/30 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-vantaire-charcoal border border-vantaire-border flex items-center justify-center text-vantaire-champagne flex-shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-vantaire-warmWhite truncate">
              {displayName || userEmail}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-vantaire-champagne/15 text-vantaire-champagne border border-vantaire-champagne/30">
                {role.toUpperCase()}
              </span>
              <span className="text-[10px] text-vantaire-muted truncate">
                {userEmail}
              </span>
            </div>
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
    </aside>
  );
}
