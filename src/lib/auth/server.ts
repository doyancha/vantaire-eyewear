import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { Tables } from "@/types/database.types";

export type AdminProfile = Tables<"admin_profiles">;

export interface AuthenticatedAdminContext {
  user: User;
  profile: AdminProfile;
}

/**
 * Returns the currently authenticated Supabase Auth user.
 * Strictly uses supabase.auth.getUser() to authenticate the user against the server
 * rather than trusting insecure client session data.
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Resolves the authenticated user and their corresponding admin_profiles record.
 * Returns null if unauthenticated or if the user is an outsider without an admin profile.
 */
export async function getCurrentAdminProfile(): Promise<AuthenticatedAdminContext | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("admin_profiles")
    .select("id, role, display_name, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  return { user, profile };
}

/**
 * Server-side authorization guard requiring active 'owner' or 'admin' role.
 * Redirects unauthenticated or unauthorized users to /admin/login.
 */
export async function requireAdmin(): Promise<AuthenticatedAdminContext> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("admin_profiles")
    .select("id, role, display_name, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || (profile.role !== "owner" && profile.role !== "admin")) {
    // Authenticated user exists but has NO admin authorization
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return { user, profile };
}

/**
 * Server-side authorization guard requiring strict 'owner' role.
 * Rejects standard 'admin' and outsider users.
 */
export async function requireOwner(): Promise<AuthenticatedAdminContext> {
  const context = await requireAdmin();

  if (context.profile.role !== "owner") {
    throw new Error("Forbidden: This action requires Owner authorization.");
  }

  return context;
}
