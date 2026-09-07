import { requireAdmin } from "@/lib/auth/server";

export default async function AdminHomePage() {
  const { user, profile } = await requireAdmin();

  return (
    <div className="space-y-6">
      <div className="border border-vantaire-warmWhite/10 rounded-lg p-6 bg-vantaire-charcoal/40 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-serif text-2xl tracking-wide text-vantaire-warmWhite">
              Security Boundary Verified
            </h1>
            <p className="text-sm text-vantaire-warmWhite/60 mt-1">
              Welcome to the protected VANTAIRE administrative perimeter.
            </p>
          </div>
          <span className="text-xs uppercase tracking-widest px-3 py-1 rounded bg-vantaire-champagne/15 text-vantaire-champagne border border-vantaire-champagne/30 font-semibold">
            {profile.role.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-vantaire-warmWhite/10 text-sm">
          <div className="p-4 rounded bg-vantaire-black/40 border border-vantaire-warmWhite/5">
            <span className="text-xs uppercase tracking-wider text-vantaire-warmWhite/40 block mb-1">
              Administrator Identity
            </span>
            <span className="font-medium text-vantaire-warmWhite">
              {profile.display_name || user.email}
            </span>
          </div>

          <div className="p-4 rounded bg-vantaire-black/40 border border-vantaire-warmWhite/5">
            <span className="text-xs uppercase tracking-wider text-vantaire-warmWhite/40 block mb-1">
              Authorization Level
            </span>
            <span className="font-medium text-vantaire-warmWhite capitalize">
              {profile.role} Permissions Active
            </span>
          </div>
        </div>
      </div>

      <div className="border border-vantaire-warmWhite/10 rounded-lg p-6 bg-vantaire-charcoal/20">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-vantaire-warmWhite/70 mb-2">
          Architecture Milestone: Phase 2 Active
        </h2>
        <p className="text-xs text-vantaire-warmWhite/50 leading-relaxed">
          Row Level Security (RLS) is strictly enforced across all database tables. Public
          storefront catalog reads remain anchored to static verified data. Catalog and
          media management dashboards will be enabled in subsequent phases.
        </p>
      </div>
    </div>
  );
}
