import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/server";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "VANTAIRE Admin | Backoffice Overview",
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
    <AdminShell
      userEmail={user.email || ""}
      displayName={profile.display_name || user.email || "Admin User"}
      role={profile.role}
    >
      {children}
    </AdminShell>
  );
}
