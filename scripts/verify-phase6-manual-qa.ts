import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../src/types/database.types";

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
const ANON_KEY: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE_ROLE_KEY: string = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runManualQaVerification() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 6 MANUAL QA & SESSION TESTS");
  console.log("==================================================");

  const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const testPassword = process.env.VANTAIRE_LOCAL_OWNER_PASSWORD || crypto.randomBytes(16).toString("hex") + "!Aa1";

  const { data: listData } = await adminClient.auth.admin.listUsers();
  const ownerUser = listData?.users.find((u) => u.email === "owner@vantaire.local");
  const adminUser = listData?.users.find((u) => u.email === "admin@vantaire.local");
  const outsiderUser = listData?.users.find((u) => u.email === "outsider@vantaire.local");

  if (!ownerUser || !adminUser || !outsiderUser) {
    throw new Error("Local test users not found in Supabase Auth");
  }

  await adminClient.auth.admin.updateUserById(ownerUser.id, { password: testPassword });
  await adminClient.auth.admin.updateUserById(adminUser.id, { password: testPassword });
  await adminClient.auth.admin.updateUserById(outsiderUser.id, { password: testPassword });

  const anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("\n[1/5] Testing Owner Login & Profile Resolution...");
  const ownerAuth = await anonClient.auth.signInWithPassword({
    email: "owner@vantaire.local",
    password: testPassword,
  });
  assert(Boolean(ownerAuth.data?.session), "Owner authenticated successfully with valid JWT");

  const ownerSessionClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${ownerAuth.data.session!.access_token}` },
    },
  });

  const { data: ownerProfile } = await ownerSessionClient
    .from("admin_profiles")
    .select("*")
    .eq("id", ownerUser.id)
    .single();

  assert(ownerProfile?.role === "owner", `Owner profile resolved with 'owner' role`);

  console.log("\n[2/5] Testing Admin Login & Profile Resolution...");
  const adminAuth = await anonClient.auth.signInWithPassword({
    email: "admin@vantaire.local",
    password: testPassword,
  });
  assert(Boolean(adminAuth.data?.session), "Admin authenticated successfully with valid JWT");

  const adminSessionClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${adminAuth.data.session!.access_token}` },
    },
  });

  const { data: adminProfile } = await adminSessionClient
    .from("admin_profiles")
    .select("*")
    .eq("id", adminUser.id)
    .single();

  assert(adminProfile?.role === "admin", `Admin profile resolved with 'admin' role`);

  console.log("\n[3/5] Testing Outsider Denial & Zero Data Leak...");
  const outsiderAuth = await anonClient.auth.signInWithPassword({
    email: "outsider@vantaire.local",
    password: testPassword,
  });
  assert(Boolean(outsiderAuth.data?.session), "Outsider signs in at Auth level");

  const outsiderSessionClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${outsiderAuth.data.session!.access_token}` },
    },
  });

  const { data: outsiderProfile } = await outsiderSessionClient
    .from("admin_profiles")
    .select("*")
    .eq("id", outsiderUser.id)
    .maybeSingle();

  assert(outsiderProfile === null, "Outsider has 0 admin profiles and is denied by RLS");

  console.log("\n[4/5] Testing Session Logout Invalidation...");
  const { error: signOutErr } = await anonClient.auth.signOut();
  assert(!signOutErr, "Sign out executed cleanly without error");

  const { data: userAfterSignOut } = await anonClient.auth.getUser();
  assert(userAfterSignOut.user === null, "getUser() returns null immediately after sign out");

  console.log("\n[5/5] Testing Cache Header Directive & Dynamic Export Enforcement...");
  const layoutContent = fs.readFileSync(path.resolve(process.cwd(), "src/app/admin/(protected)/layout.tsx"), "utf-8");
  const middlewareContent = fs.readFileSync(path.resolve(process.cwd(), "src/lib/supabase/middleware.ts"), "utf-8");

  assert(layoutContent.includes("export const dynamic = \"force-dynamic\""), "Layout enforces force-dynamic");
  assert(layoutContent.includes("export const revalidate = 0"), "Layout enforces revalidate = 0");
  assert(
    middlewareContent.includes("private, no-cache, no-store, max-age=0, must-revalidate"),
    "Middleware enforces private, no-store, max-age=0, must-revalidate"
  );

  console.log("\n==================================================");
  console.log("MANUAL QA & SESSION VERIFICATION SUMMARY");
  console.log("==================================================");
  console.log(`Assertions Passed: ${passed}`);
  console.log(`Assertions Failed: ${failed}`);

  if (failed > 0) {
    console.error(`\n❌ MANUAL QA VERIFICATION FAILED with ${failed} failures.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 ALL MANUAL QA & SESSION TESTS PASSED!`);
  }
}

runManualQaVerification().catch((err) => {
  console.error("Fatal Manual QA error:", err);
  process.exit(1);
});
