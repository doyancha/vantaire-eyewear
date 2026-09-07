import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin Sign In | VANTAIRE EYEWEAR",
  description: "Internal administrative sign in for VANTAIRE EYEWEAR staff.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-vantaire-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-vantaire-charcoal/50 border border-vantaire-warmWhite/10 rounded-lg p-8 shadow-2xl backdrop-blur-sm">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-vantaire-champagne block mb-2 font-sans font-semibold">
            Security Perimeter
          </span>
          <h1 className="font-serif text-2xl tracking-wider text-vantaire-warmWhite">
            VANTAIRE
          </h1>
          <p className="text-xs uppercase tracking-widest text-vantaire-warmWhite/50 mt-1 font-sans">
            Internal Staff Portal
          </p>
        </div>

        <LoginForm />

        <div className="mt-8 pt-6 border-t border-vantaire-warmWhite/10 text-center">
          <p className="text-[11px] text-vantaire-warmWhite/40 font-sans">
            Protected internal system. Unauthorized access attempts are monitored and logged.
          </p>
        </div>
      </div>
    </div>
  );
}
