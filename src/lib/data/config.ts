/**
 * Storefront Data Source Configuration & Controlled Rollback Policy
 * -----------------------------------------------------------------------------
 * Controls whether the public storefront consumes live Supabase data or the
 * frozen historical static catalog baseline.
 * 
 * Environments:
 *   VANTAIRE_STOREFRONT_DATA_SOURCE: "supabase" | "static" (default: "static")
 *   VANTAIRE_ALLOW_STATIC_FALLBACK: "true" | "false" (default: "false")
 * 
 * Safety Rules:
 *   - In production / CI without local DB, defaults to "static".
 *   - When configured as "supabase", database errors are observable and will NOT
 *     silently fail over to stale static data unless explicitly permitted by
 *     VANTAIRE_ALLOW_STATIC_FALLBACK=true.
 */

export type StorefrontDataSource = "static" | "supabase";

export function getStorefrontDataSource(): StorefrontDataSource {
  const envSource = process.env.VANTAIRE_STOREFRONT_DATA_SOURCE?.toLowerCase()?.trim();
  if (envSource === "supabase") {
    return "supabase";
  }
  return "static";
}

export function isStaticFallbackAllowed(): boolean {
  return process.env.VANTAIRE_ALLOW_STATIC_FALLBACK?.toLowerCase()?.trim() === "true";
}
