import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/server";
import { logoutAction } from "@/app/admin/login/actions";

export const metadata: Metadata = {
  title: "Admin Portal | VANTAIRE EYEWEAR",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Enforce server-side security boundary: redirects unauthenticated/outsiders to /admin/login
  const { user, profile } = await requireAdmin();

  return (
    <div className="min-h-screen bg-vantaire-black text-vantaire-warmWhite flex flex-col font-sans">
      {/* Admin Top Navigation Bar */}
      <header className="border-b border-vantaire-warmWhite/10 bg-vantaire-charcoal/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="font-serif text-lg tracking-wider text-vantaire-warmWhite font-bold">
            VANTAIRE
          </span>
          <span className="text-[11px] uppercase tracking-widest text-vantaire-champagne font-sans font-medium px-2 py-0.5 rounded bg-vantaire-champagne/10 border border-vantaire-champagne/20">
            Admin Console
          </span>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right font-sans">
            <span className="text-xs text-vantaire-warmWhite block font-medium">
              {profile.display_name || user.email}
            </span>
            <span className="inline-block text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 mt-0.5 rounded bg-vantaire-champagne/15 text-vantaire-champagne border border-vantaire-champagne/20">
              Role: {profile.role}
            </span>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="text-xs uppercase tracking-widest px-3 py-1.5 rounded border border-vantaire-warmWhite/20 text-vantaire-warmWhite/70 hover:text-vantaire-warmWhite hover:border-vantaire-warmWhite/40 hover:bg-vantaire-warmWhite/5 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </form>
        </div>
      </header>

      {/* Main Admin Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
