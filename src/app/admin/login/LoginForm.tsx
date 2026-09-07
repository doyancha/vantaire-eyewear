"use client";

import { useActionState } from "react";
import { loginAction, LoginActionResult } from "./actions";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<LoginActionResult | null, FormData>(
    loginAction,
    null
  );

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div
          role="alert"
          className="p-3.5 bg-red-950/40 border border-red-800/60 rounded text-red-200 text-sm font-sans"
        >
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-xs uppercase tracking-widest text-vantaire-warmWhite/70 mb-2 font-sans"
        >
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={isPending}
          placeholder="admin@vantaireeyewear.com"
          className="w-full px-4 py-3 bg-vantaire-black/60 border border-vantaire-warmWhite/20 rounded text-vantaire-warmWhite placeholder-vantaire-warmWhite/30 text-sm focus:outline-none focus:border-vantaire-champagne transition-colors disabled:opacity-50"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs uppercase tracking-widest text-vantaire-warmWhite/70 mb-2 font-sans"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={isPending}
          placeholder="••••••••••••"
          className="w-full px-4 py-3 bg-vantaire-black/60 border border-vantaire-warmWhite/20 rounded text-vantaire-warmWhite placeholder-vantaire-warmWhite/30 text-sm focus:outline-none focus:border-vantaire-champagne transition-colors disabled:opacity-50"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 px-4 bg-vantaire-champagne text-vantaire-black font-semibold text-xs tracking-widest uppercase rounded hover:bg-vantaire-champagne/90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-vantaire-champagne focus:ring-offset-2 focus:ring-offset-vantaire-black disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isPending ? "Authenticating..." : "Sign In to Admin"}
      </button>
    </form>
  );
}
