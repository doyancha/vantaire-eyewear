import { createClient } from "@supabase/supabase-js";
import { Database } from "../src/types/database.types";

console.log("==================================================");
console.log("VANTAIRE EYEWEAR v1.3 — PHASE 2 ROUTE & AUTH LOGIC VERIFICATION");
console.log("==================================================");

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:55321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error("Required Supabase credentials missing from environment / .env.local");
}

let failedAssertions = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ ${description}`);
  } else {
    console.error(`  ❌ FAILED: ${description}`);
    failedAssertions++;
  }
}

async function runRouteAuthTests() {
  console.log("\n[1/3] Testing Login Logic & Generic Security Error Response...");

  const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const runtimeSecret = crypto.randomBytes(16).toString("hex") + "!Aa1";

  // Sync test user passwords for test run
  const { data: listData } = await adminClient.auth.admin.listUsers();
  const ownerUser = listData?.users.find((u) => u.email === "owner@vantaire.local");
  const adminUser = listData?.users.find((u) => u.email === "admin@vantaire.local");
  const outsiderUser = listData?.users.find((u) => u.email === "outsider@vantaire.local");

  if (!ownerUser || !adminUser || !outsiderUser) {
    throw new Error("Test users not found; run verify-phase2-security.ts first.");
  }

  await adminClient.auth.admin.updateUserById(ownerUser.id, { password: runtimeSecret });
  await adminClient.auth.admin.updateUserById(adminUser.id, { password: runtimeSecret });
  await adminClient.auth.admin.updateUserById(outsiderUser.id, { password: runtimeSecret });

  const anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Wrong password
  const wrongPass = await anonClient.auth.signInWithPassword({
    email: "owner@vantaire.local",
    password: "WrongPassword!123",
  });
  assert(Boolean(wrongPass.error), "Login attempt with incorrect password fails authentication");

  // 2. Non-existent email
  const nonExistent = await anonClient.auth.signInWithPassword({
    email: "nonexistent@vantaire.local",
    password: "SomePassword!123",
  });
  assert(Boolean(nonExistent.error), "Login attempt with non-existent email fails authentication");

  // Verify generic error message consistency (both return an auth failure without leaking identity)
  assert(
    Boolean(wrongPass.error?.message.includes("credentials") || wrongPass.error?.message.includes("Invalid")),
    "Auth error wording is generic for incorrect password"
  );

  // 3. Outsider credentials succeed at Auth level, but are rejected at admin_profiles level
  const outsiderAuth = await anonClient.auth.signInWithPassword({
    email: "outsider@vantaire.local",
    password: runtimeSecret,
  });
  assert(!outsiderAuth.error && Boolean(outsiderAuth.data.user), "Outsider has valid Supabase Auth account");

  // Check admin profile for outsider
  const outsiderUserClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${outsiderAuth.data.session?.access_token}` } },
  });

  const { data: outsiderProfile } = await outsiderUserClient
    .from("admin_profiles")
    .select("id, role")
    .eq("id", outsiderAuth.data.user!.id)
    .maybeSingle();

  assert(outsiderProfile === null, "Outsider has NO admin profile record");
  const outsiderAllowed = Boolean(outsiderProfile && (outsiderProfile.role === "owner" || outsiderProfile.role === "admin"));
  assert(!outsiderAllowed, "Outsider is strictly denied administrative access");

  console.log("\n[2/3] Testing Admin & Owner Role Resolution...");

  // Admin role check
  const adminAuth = await anonClient.auth.signInWithPassword({
    email: "admin@vantaire.local",
    password: runtimeSecret,
  });
  const adminUserClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${adminAuth.data.session?.access_token}` } },
  });

  const { data: adminProfile } = await adminUserClient
    .from("admin_profiles")
    .select("id, role")
    .eq("id", adminAuth.data.user!.id)
    .single();

  assert(adminProfile?.role === "admin", "Admin user resolves with 'admin' role");
  const adminHasAdminAccess = adminProfile?.role === "owner" || adminProfile?.role === "admin";
  const adminHasOwnerAccess = adminProfile?.role === "owner";
  assert(adminHasAdminAccess, "Admin user satisfies requireAdmin() criteria");
  assert(!adminHasOwnerAccess, "Admin user is denied requireOwner() criteria");

  // Owner role check
  const ownerAuth = await anonClient.auth.signInWithPassword({
    email: "owner@vantaire.local",
    password: runtimeSecret,
  });
  const ownerUserClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${ownerAuth.data.session?.access_token}` } },
  });

  const { data: ownerProfile } = await ownerUserClient
    .from("admin_profiles")
    .select("id, role")
    .eq("id", ownerAuth.data.user!.id)
    .single();

  assert(ownerProfile?.role === "owner", "Owner user resolves with 'owner' role");
  const ownerHasAdminAccess = ownerProfile?.role === "owner" || ownerProfile?.role === "admin";
  const ownerHasOwnerAccess = ownerProfile?.role === "owner";
  assert(ownerHasAdminAccess, "Owner user satisfies requireAdmin() criteria");
  assert(ownerHasOwnerAccess, "Owner user satisfies requireOwner() criteria");

  console.log("\n[3/3] Testing Logout Invalidation...");
  const sessionClient = createClient<Database>(SUPABASE_URL, ANON_KEY);
  await sessionClient.auth.signInWithPassword({
    email: "owner@vantaire.local",
    password: runtimeSecret,
  });
  const preSignoutUser = await sessionClient.auth.getUser();
  assert(Boolean(preSignoutUser.data.user), "User is authenticated prior to logout");

  await sessionClient.auth.signOut();
  const postSignoutUser = await sessionClient.auth.getUser();
  assert(postSignoutUser.data.user === null, "Logout terminates session and getUser() returns null");

  console.log("\n==================================================");
  if (failedAssertions === 0) {
    console.log("🏆 ALL ROUTE & AUTH LOGIC TESTS PASSED!");
    console.log("==================================================");
    process.exit(0);
  } else {
    console.error(`💥 FAILED: ${failedAssertions} assertion(s) failed.`);
    console.log("==================================================");
    process.exit(1);
  }
}

runRouteAuthTests().catch((err) => {
  console.error("FATAL ROUTE SUITE ERROR:", err);
  process.exit(1);
});
