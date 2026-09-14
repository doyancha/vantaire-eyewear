import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

/**
 * Public Anonymous Supabase Client
 * -----------------------------------------------------------------------------
 * Designed strictly for public storefront reads.
 * Uses the Supabase Anonymous Key and is fully constrained by Row-Level Security (RLS).
 * Completely session-independent (no cookies, no session persistence).
 * Never imports or exposes SUPABASE_SERVICE_ROLE_KEY.
 */

let publicClientInstance: ReturnType<typeof createClient<Database>> | null = null;

export function getPublicSupabaseClient() {
  if (publicClientInstance) {
    return publicClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for public storefront data access."
    );
  }

  publicClientInstance = createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return publicClientInstance;
}
