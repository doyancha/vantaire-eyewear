"use client";

import Link from "next/link";
import { ExternalLink, LogOut, Shield } from "lucide-react";
import { logoutAction } from "@/app/admin/login/actions";
import { AdminMobileNav } from "./AdminMobileNav";

interface AdminHeaderProps {
  userEmail: string;
  displayName: string;
  role: string;
}

export function AdminHeader({
  userEmail,
  displayName,
  role,
}: AdminHeaderProps) {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 bg-vantaire-charcoal/90 backdrop-blur-md border-b border-vantaire-border/80">
      {/* Left: Mobile Nav Trigger & Page Breadcrumb */}
      <div className="flex items-center gap-3">
        <AdminMobileNav
          userEmail={userEmail}
          displayName={displayName}
          role={role}
        />

        <div className="flex items-center gap-2">
          <span className="font-serif text-sm sm:text-base text-vantaire-warmWhite font-medium">
            Dashboard
          </span>
          <span className="text-vantaire-muted text-xs">/</span>
          <span className="text-xs text-vantaire-sand font-mono uppercase tracking-wider">
            Overview
          </span>
        </div>
      </div>

      {/* Right: Environment Badge, Storefront Link, User Pill, Sign Out */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Environment Badge */}
        {isDevelopment && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Local Dev
          </span>
        )}

        {/* View Storefront Link */}
        <Link
          href="/"
          className="hidden md:inline-flex items-center gap-1.5 text-xs text-vantaire-sand hover:text-vantaire-champagne transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          <span>View Storefront</span>
        </Link>

        {/* User Identity & Role Badge */}
        <div className="flex items-center gap-2 pl-2 sm:border-l sm:border-vantaire-border/60">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-medium text-vantaire-warmWhite truncate max-w-[150px]">
              {displayName || userEmail}
            </p>
          </div>

          <div
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest border ${
              role === "owner"
                ? "bg-vantaire-champagne/15 text-vantaire-champagne border-vantaire-champagne/30"
                : "bg-vantaire-sand/15 text-vantaire-sand border-vantaire-sand/30"
            }`}
          >
            <Shield className="w-2.5 h-2.5" aria-hidden="true" />
            <span>{role}</span>
          </div>
        </div>

        {/* Desktop Logout Button */}
        <form action={logoutAction} className="hidden sm:block">
          <button
            type="submit"
            className="p-1.5 text-vantaire-muted hover:text-vantaire-warmWhite focus:outline-none focus:ring-1 focus:ring-vantaire-champagne transition-colors cursor-pointer"
            aria-label="Sign Out"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </header>
  );
}
