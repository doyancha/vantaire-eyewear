import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

interface AdminShellProps {
  children: React.ReactNode;
  userEmail: string;
  displayName: string;
  role: string;
}

export function AdminShell({
  children,
  userEmail,
  displayName,
  role,
}: AdminShellProps) {
  return (
    <div className="min-h-screen bg-vantaire-black text-vantaire-warmWhite font-sans flex flex-col lg:flex-row antialiased">
      {/* Keyboard Accessible Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-vantaire-champagne focus:text-vantaire-black focus:font-semibold focus:shadow-xl focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Desktop Persistent Sidebar */}
      <AdminSidebar
        userEmail={userEmail}
        displayName={displayName}
        role={role}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          userEmail={userEmail}
          displayName={displayName}
          role={role}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
