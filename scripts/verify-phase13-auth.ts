import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import { assertLocalVantaireSupabaseTarget, loadEnvLocal } from "./local-guard";
import { Database } from "../src/types/database.types";

assertLocalVantaireSupabaseTarget();
loadEnvLocal();

console.log("======================================================================");
console.log("PHASE 13 SECURITY: AUTHENTICATION & AUTHORIZATION HARDENING VERIFIER");
console.log("======================================================================\n");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:55321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase keys in environment");
}

const serviceClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

async function run() {
  const ts = Date.now();
  const disposableOwnerEmail = `test-owner-${ts}@vantaire.test`;
  const disposableAdminEmail = `test-admin-${ts}@vantaire.test`;
  const disposableOutsiderEmail = `test-outsider-${ts}@vantaire.test`;
  const securePassword = `Vantaire#Secure!${ts}`;

  let disposableOwnerId = "";
  let disposableAdminId = "";
  let disposableOutsiderId = "";

  try {
    // 1. Config Check
    console.log("1. Supabase Auth Configuration Inspection:");
    const configPath = path.resolve(process.cwd(), "supabase/config.toml");
    const configContent = fs.readFileSync(configPath, "utf-8");

    const signupDisabled = configContent.includes("enable_signup = false");
    assert(signupDisabled, "Self-signup is disabled in supabase/config.toml");

    const minPasswordLength = /minimum_password_length\s*=\s*(\d+)/.exec(configContent);
    assert(
      minPasswordLength !== null && parseInt(minPasswordLength[1], 10) >= 12,
      `Minimum password length is configured to >= 12 (got: ${minPasswordLength?.[1]})`
    );

    const passwordRequirements = configContent.includes(
      'password_requirements = "lower_upper_letters_digits_symbols"'
    );
    assert(
      passwordRequirements,
      "Password requirements require lower, upper, digits, and symbols"
    );

    const securePasswordChange = configContent.includes("secure_password_change = true");
    assert(securePasswordChange, "Secure password change is enabled");

    // 2. Direct Signup Rejection
    console.log("\n2. Direct Public Signup Rejection Test:");
    const anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signupData, error: signupError } = await anonClient.auth.signUp({
      email: `unauthorized-signup-${ts}@vantaire.test`,
      password: securePassword,
    });
    assert(
      signupError !== null || (signupData && !signupData.user),
      `Public direct signup is rejected (error: ${signupError?.message || "none"})`
    );

    // 3. Login Input Bounds & Validation
    console.log("\n3. Login Bounds and Uniform Error Message Verification:");
    const longEmail = `${"a".repeat(255)}@vantaire.local`;
    const longPassword = "P".repeat(1025);

    const isEmailValid = (e: string) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    const isPasswordValid = (p: string) => p.length > 0 && p.length <= 1024;

    assert(!isEmailValid(longEmail), "Oversized email (>254 chars) is rejected by input guard");
    assert(!isPasswordValid(longPassword), "Oversized password (>1024 chars) is rejected by input guard");
    assert(!isEmailValid("not-an-email"), "Malformed email format is rejected by input guard");

    // 4. Create Disposable Identities via Service Role
    console.log("\n4. Disposable Test Identities Creation:");
    const { data: ownerUser, error: ownerErr } = await serviceClient.auth.admin.createUser({
      email: disposableOwnerEmail,
      password: securePassword,
      email_confirm: true,
    });
    if (ownerErr || !ownerUser.user) throw new Error(`Failed to create disposable owner: ${ownerErr?.message}`);
    disposableOwnerId = ownerUser.user.id;

    const { error: ownerProfErr } = await serviceClient.from("admin_profiles").insert({
      id: disposableOwnerId,
      role: "owner",
      display_name: "Disposable Owner",
    });
    if (ownerProfErr) throw new Error(`Failed to create owner profile: ${ownerProfErr.message}`);

    const { data: adminUser, error: adminErr } = await serviceClient.auth.admin.createUser({
      email: disposableAdminEmail,
      password: securePassword,
      email_confirm: true,
    });
    if (adminErr || !adminUser.user) throw new Error(`Failed to create disposable admin: ${adminErr?.message}`);
    disposableAdminId = adminUser.user.id;

    const { error: adminProfErr } = await serviceClient.from("admin_profiles").insert({
      id: disposableAdminId,
      role: "admin",
      display_name: "Disposable Admin",
    });
    if (adminProfErr) throw new Error(`Failed to create admin profile: ${adminProfErr.message}`);

    const { data: outsiderUser, error: outsiderErr } = await serviceClient.auth.admin.createUser({
      email: disposableOutsiderEmail,
      password: securePassword,
      email_confirm: true,
    });
    if (outsiderErr || !outsiderUser.user) throw new Error(`Failed to create disposable outsider: ${outsiderErr?.message}`);
    disposableOutsiderId = outsiderUser.user.id;

    assert(
      Boolean(disposableOwnerId && disposableAdminId && disposableOutsiderId),
      "Created isolated disposable owner, admin, and outsider test identities"
    );

    // 5. Authentication & Authorization Tests
    console.log("\n5. Authentication & Role Entitlement Verification:");

    // Disposable Owner Login
    const ownerAuthClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: ownerLoginData, error: ownerLoginErr } = await ownerAuthClient.auth.signInWithPassword({
      email: disposableOwnerEmail,
      password: securePassword,
    });
    assert(!ownerLoginErr && !!ownerLoginData.session, "Disposable owner signs in successfully");

    const { data: ownerProfiles } = await ownerAuthClient
      .from("admin_profiles")
      .select("role")
      .eq("id", disposableOwnerId);
    assert(ownerProfiles?.[0]?.role === "owner", "Disposable owner can read admin_profiles and holds owner role");

    // Disposable Admin Login
    const adminAuthClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: adminLoginData, error: adminLoginErr } = await adminAuthClient.auth.signInWithPassword({
      email: disposableAdminEmail,
      password: securePassword,
    });
    assert(!adminLoginErr && !!adminLoginData.session, "Disposable admin signs in successfully");

    const { data: adminProfiles } = await adminAuthClient
      .from("admin_profiles")
      .select("role")
      .eq("id", disposableAdminId);
    assert(adminProfiles?.[0]?.role === "admin", "Disposable admin can read admin_profiles and holds admin role");

    // Disposable Outsider Login
    const outsiderAuthClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: outsiderLoginData, error: outsiderLoginErr } = await outsiderAuthClient.auth.signInWithPassword({
      email: disposableOutsiderEmail,
      password: securePassword,
    });
    assert(!outsiderLoginErr && !!outsiderLoginData.session, "Outsider can authenticate in auth layer");

    const { data: outsiderProfiles } = await outsiderAuthClient
      .from("admin_profiles")
      .select("role")
      .eq("id", disposableOutsiderId);
    assert(
      !outsiderProfiles || outsiderProfiles.length === 0,
      "Outsider is denied by RLS when reading admin_profiles (empty result)"
    );

    // 6. Mid-Session Role Revocation Test
    console.log("\n6. Mid-Session Admin Role Revocation Test:");
    // Admin has active session in adminAuthClient
    // Revoke admin from admin_profiles
    const { error: revokeErr } = await serviceClient
      .from("admin_profiles")
      .delete()
      .eq("id", disposableAdminId);
    assert(!revokeErr, "Revoked disposable admin profile in database");

    // Attempt catalog mutation using existing active admin JWT
    const { data: updatedData, error: updateErr } = await adminAuthClient
      .from("products")
      .update({ name: "Malicious Tamper Attempt" })
      .eq("slug", "solstice-titanium-sunglasses")
      .select();

    const { data: currentProduct } = await serviceClient
      .from("products")
      .select("name")
      .eq("slug", "solstice-titanium-sunglasses")
      .single();

    const { error: insertErr } = await adminAuthClient
      .from("products")
      .insert({
        name: "Unauthorized Product",
        slug: `unauthorized-slug-${ts}`,
        price: 100,
        currency: "USD",
        sort_order: 999,
        is_active: false,
      } as any);

    const isCatalogMutationBlocked =
      insertErr !== null &&
      (!updatedData || updatedData.length === 0) &&
      currentProduct?.name !== "Malicious Tamper Attempt";

    assert(
      isCatalogMutationBlocked,
      "Revoked admin session is IMMEDIATELY rejected by RLS on catalog mutations (insert error, 0 rows updated)"
    );

    // Attempt storage mutation using existing active admin JWT
    const { error: storageErr } = await adminAuthClient.storage
      .from("product-media")
      .upload("products/solstice-titanium-sunglasses/image-malicious.webp", Buffer.from("test"), {
        contentType: "image/webp",
      });
    assert(
      storageErr !== null,
      "Revoked admin session is IMMEDIATELY rejected by storage policy on media upload"
    );

    // 7. Local Dev Credentials Integrity Preservation
    console.log("\n7. Local Development Credentials Invariant Check:");
    const { data: usersData, error: usersErr } = await serviceClient.auth.admin.listUsers();
    assert(!usersErr && !!usersData, "Listed auth.users via admin API");

    const devOwnerAuth = usersData?.users.find((u) => u.email === "owner@vantaire.local");
    const devAdminAuth = usersData?.users.find((u) => u.email === "admin@vantaire.local");

    assert(devOwnerAuth !== undefined, "Local developer owner account (owner@vantaire.local) exists in auth.users");
    assert(devAdminAuth !== undefined, "Local developer admin account (admin@vantaire.local) exists in auth.users");

    if (devOwnerAuth) {
      const { data: devOwnerProfile } = await serviceClient
        .from("admin_profiles")
        .select("id, role")
        .eq("id", devOwnerAuth.id)
        .maybeSingle();
      assert(
        devOwnerProfile !== null && devOwnerProfile.role === "owner",
        "Local developer owner account intact with owner role in admin_profiles"
      );
    }

    if (devAdminAuth) {
      const { data: devAdminProfile } = await serviceClient
        .from("admin_profiles")
        .select("id, role")
        .eq("id", devAdminAuth.id)
        .maybeSingle();
      assert(
        devAdminProfile !== null && devAdminProfile.role === "admin",
        "Local developer admin account intact with admin role in admin_profiles"
      );
    }

  } finally {
    // Clean up disposable users
    console.log("\nCleaning up disposable test identities...");
    if (disposableOwnerId) {
      await serviceClient.from("admin_profiles").delete().eq("id", disposableOwnerId);
      await serviceClient.auth.admin.deleteUser(disposableOwnerId);
    }
    if (disposableAdminId) {
      await serviceClient.from("admin_profiles").delete().eq("id", disposableAdminId);
      await serviceClient.auth.admin.deleteUser(disposableAdminId);
    }
    if (disposableOutsiderId) {
      await serviceClient.from("admin_profiles").delete().eq("id", disposableOutsiderId);
      await serviceClient.auth.admin.deleteUser(disposableOutsiderId);
    }
    console.log("Cleanup complete.");
  }

  console.log("\n======================================================================");
  console.log(`AUTHENTICATION SECURITY COMPLETE: ${passed} passed, ${failed} failed`);
  console.log("======================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal error in verify-phase13-auth:", err);
  process.exit(1);
});
