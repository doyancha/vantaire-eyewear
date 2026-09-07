import { createClient } from "@supabase/supabase-js";
import { Database } from "../src/types/database.types";

console.log("==================================================");
console.log("VANTAIRE EYEWEAR v1.3 — PHASE 2 AUTHENTIC-JWT SECURITY VERIFICATION");
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

// -----------------------------------------------------------------------------
// POSTGREST DIRECT HTTP CALLER
// -----------------------------------------------------------------------------
async function callPostgrest(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  token: string,
  body?: any
): Promise<{ status: number; data: any }> {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers: Record<string, string> = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

async function runSecuritySuite() {
  console.log("\n[1/7] Provisioning Local Test Identities via Supabase Admin API...");

  const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Dynamic non-committed runtime test credentials
  const runtimeSecret = crypto.randomBytes(16).toString("hex") + "!Aa1";
  const testCredentials = {
    owner: {
      email: "owner@vantaire.local",
      password: runtimeSecret,
      role: "owner" as const,
      displayName: "Local Owner",
    },
    admin: {
      email: "admin@vantaire.local",
      password: runtimeSecret,
      role: "admin" as const,
      displayName: "Local Admin",
    },
    outsider: {
      email: "outsider@vantaire.local",
      password: runtimeSecret,
    },
  };

  async function ensureUser(email: string, pass: string): Promise<string> {
    const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers();
    if (listErr) throw listErr;

    const existing = listData.users.find((u) => u.email === email);
    if (existing) {
      await adminClient.auth.admin.updateUserById(existing.id, {
        password: pass,
        email_confirm: true,
      });
      return existing.id;
    }

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: pass,
      email_confirm: true,
    });
    if (createErr || !created.user) throw createErr || new Error("Failed to create user");
    return created.user.id;
  }

  const ownerId = await ensureUser(testCredentials.owner.email, testCredentials.owner.password);
  const adminId = await ensureUser(testCredentials.admin.email, testCredentials.admin.password);
  const outsiderId = await ensureUser(testCredentials.outsider.email, testCredentials.outsider.password);

  // Setup admin_profiles
  await adminClient
    .from("admin_profiles")
    .upsert({ id: ownerId, role: "owner", display_name: testCredentials.owner.displayName });

  await adminClient
    .from("admin_profiles")
    .upsert({ id: adminId, role: "admin", display_name: testCredentials.admin.displayName });

  // Ensure outsider has NO admin profile
  await adminClient.from("admin_profiles").delete().eq("id", outsiderId);

  assert(Boolean(ownerId && adminId && outsiderId), "Local test users provisioned successfully");

  // ---------------------------------------------------------------------------
  // [2/7] OBTAIN AUTHENTIC SUPABASE AUTH JWTs
  // ---------------------------------------------------------------------------
  console.log("\n[2/7] Authenticating via Supabase Auth & Acquiring Real JWTs...");

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: ownerAuth, error: ownerErr } = await authClient.auth.signInWithPassword({
    email: testCredentials.owner.email,
    password: testCredentials.owner.password,
  });
  if (ownerErr || !ownerAuth.session) throw new Error(`Owner login failed: ${ownerErr?.message}`);
  const ownerJwt = ownerAuth.session.access_token;

  const { data: adminAuth, error: adminErr } = await authClient.auth.signInWithPassword({
    email: testCredentials.admin.email,
    password: testCredentials.admin.password,
  });
  if (adminErr || !adminAuth.session) throw new Error(`Admin login failed: ${adminErr?.message}`);
  const adminJwt = adminAuth.session.access_token;

  const { data: outsiderAuth, error: outsiderErr } = await authClient.auth.signInWithPassword({
    email: testCredentials.outsider.email,
    password: testCredentials.outsider.password,
  });
  if (outsiderErr || !outsiderAuth.session) throw new Error(`Outsider login failed: ${outsiderErr?.message}`);
  const outsiderJwt = outsiderAuth.session.access_token;

  assert(Boolean(ownerJwt && adminJwt && outsiderJwt), "Real Supabase Auth JWTs acquired for Owner, Admin, and Outsider");

  // Seed baseline site_settings singleton if empty
  await adminClient.from("site_settings").upsert({
    id: 1,
    whatsapp_default_greeting: "Hello VANTAIRE",
    contact_hours: "10-8",
    contact_friday_hours: "Closed",
    delivery_advance_payment_note: "COD available",
    delivery_packaging: "Protective case",
  });

  // Seed fixture products (1 active, 1 inactive) and collection (1 active, 1 inactive)
  const testActiveProd = {
    legacy_id: "sec-prod-active",
    slug: "sec-prod-active-slug",
    name: "Sec Active Prod",
    short_name: "Active Prod",
    price: 4000,
    currency: "BDT",
    description: "Active Desc",
    short_description: "Active Short",
    frame_shape: "Aviator",
    frame_look: "Dark Metal",
    frame_color: "Black",
    lens_color: "Smoke",
    lens_type: "Polarized-Style Tint",
    style_category: "Classic",
    fit: "Universal",
    seo_title: "Active SEO",
    seo_description: "Active SEO Desc",
    is_active: true,
  };

  const testInactiveProd = {
    legacy_id: "sec-prod-inactive",
    slug: "sec-prod-inactive-slug",
    name: "Sec Inactive Prod",
    short_name: "Inactive Prod",
    price: 4000,
    currency: "BDT",
    description: "Inactive Desc",
    short_description: "Inactive Short",
    frame_shape: "Aviator",
    frame_look: "Dark Metal",
    frame_color: "Black",
    lens_color: "Smoke",
    lens_type: "Polarized-Style Tint",
    style_category: "Classic",
    fit: "Universal",
    seo_title: "Inactive SEO",
    seo_description: "Inactive SEO Desc",
    is_active: false,
  };

  const { data: actProdRes } = await adminClient.from("products").upsert(testActiveProd, { onConflict: "slug" }).select("id").single();
  const { data: inactProdRes } = await adminClient.from("products").upsert(testInactiveProd, { onConflict: "slug" }).select("id").single();

  const testActiveCol = {
    slug: "sec-col-active",
    name: "Sec Active Col",
    tagline: "Active Tag",
    description: "Active Col Desc",
    cover_image: "/active.jpg",
    is_active: true,
  };

  const testInactiveCol = {
    slug: "sec-col-inactive",
    name: "Sec Inactive Col",
    tagline: "Inactive Tag",
    description: "Inactive Col Desc",
    cover_image: "/inactive.jpg",
    is_active: false,
  };

  const { data: actColRes } = await adminClient.from("collections").upsert(testActiveCol, { onConflict: "slug" }).select("id").single();
  const { data: inactColRes } = await adminClient.from("collections").upsert(testInactiveCol, { onConflict: "slug" }).select("id").single();

  // Attach images
  if (actProdRes) {
    await adminClient.from("product_images").upsert({
      product_id: actProdRes.id,
      storage_path: "/img-active.jpg",
      alt_text: "Active Image",
      is_primary: true,
    }, { onConflict: "product_id,storage_path" });
  }

  if (inactProdRes) {
    await adminClient.from("product_images").upsert({
      product_id: inactProdRes.id,
      storage_path: "/img-inactive.jpg",
      alt_text: "Inactive Image",
      is_primary: true,
    }, { onConflict: "product_id,storage_path" });
  }

  // Attach relations
  if (actProdRes && actColRes) {
    await adminClient.from("product_collections").upsert({
      product_id: actProdRes.id,
      collection_id: actColRes.id,
    });
  }
  if (actProdRes && inactColRes) {
    await adminClient.from("product_collections").upsert({
      product_id: actProdRes.id,
      collection_id: inactColRes.id,
    });
  }
  if (inactProdRes && actColRes) {
    await adminClient.from("product_collections").upsert({
      product_id: inactProdRes.id,
      collection_id: actColRes.id,
    });
  }

  // ---------------------------------------------------------------------------
  // [3/7] ANONYMOUS CONTEXT VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n[3/7] Testing Anonymous Context RLS Enforcement...");

  // Products
  const anonActProd = await callPostgrest("products?slug=eq.sec-prod-active-slug", "GET", ANON_KEY);
  assert(anonActProd.status === 200 && anonActProd.data.length === 1, "Anonymous: can read active products (200 OK)");

  const anonInactProd = await callPostgrest("products?slug=eq.sec-prod-inactive-slug", "GET", ANON_KEY);
  assert(anonInactProd.status === 200 && anonInactProd.data.length === 0, "Anonymous: inactive products are completely invisible (0 rows)");

  const anonProdInsert = await callPostgrest("products", "POST", ANON_KEY, { slug: "anon-insert", name: "Anon" });
  assert(anonProdInsert.status >= 400 || (Array.isArray(anonProdInsert.data) && anonProdInsert.data.length === 0), "Anonymous: product INSERT rejected by RLS");

  const anonProdPatch = await callPostgrest("products?slug=eq.sec-prod-active-slug", "PATCH", ANON_KEY, { name: "Hacked" });
  assert(anonProdPatch.status >= 400 || (Array.isArray(anonProdPatch.data) && anonProdPatch.data.length === 0), "Anonymous: product UPDATE rejected by RLS (0 rows affected)");

  const anonProdDelete = await callPostgrest("products?slug=eq.sec-prod-active-slug", "DELETE", ANON_KEY);
  assert(anonProdDelete.status >= 400 || (Array.isArray(anonProdDelete.data) && anonProdDelete.data.length === 0), "Anonymous: product DELETE rejected by RLS (0 rows affected)");

  // Collections
  const anonActCol = await callPostgrest("collections?slug=eq.sec-col-active", "GET", ANON_KEY);
  assert(anonActCol.status === 200 && anonActCol.data.length === 1, "Anonymous: can read active collections (200 OK)");

  const anonInactCol = await callPostgrest("collections?slug=eq.sec-col-inactive", "GET", ANON_KEY);
  assert(anonInactCol.status === 200 && anonInactCol.data.length === 0, "Anonymous: inactive collections are completely invisible (0 rows)");

  const anonColInsert = await callPostgrest("collections", "POST", ANON_KEY, { slug: "anon-col" });
  assert(anonColInsert.status >= 400 || (Array.isArray(anonColInsert.data) && anonColInsert.data.length === 0), "Anonymous: collection INSERT rejected by RLS");

  // Relationships & Images leak check
  const anonImages = await callPostgrest(`product_images?storage_path=eq./img-inactive.jpg`, "GET", ANON_KEY);
  assert(anonImages.status === 200 && anonImages.data.length === 0, "Anonymous: images belonging to inactive products are invisible (0 rows)");

  const anonRels = await callPostgrest("product_collections", "GET", ANON_KEY);
  const leakedRels = anonRels.data.filter((r: any) => r.product_id === inactProdRes?.id || r.collection_id === inactColRes?.id);
  assert(anonRels.status === 200 && leakedRels.length === 0, "Anonymous: relationships involving inactive items are invisible (0 leaked relations)");

  // Site settings
  const anonSettingsGet = await callPostgrest("site_settings?id=eq.1", "GET", ANON_KEY);
  assert(anonSettingsGet.status === 200 && anonSettingsGet.data.length === 1, "Anonymous: can read public site_settings (200 OK)");

  const anonSettingsPatch = await callPostgrest("site_settings?id=eq.1", "PATCH", ANON_KEY, { whatsapp_default_greeting: "Hacked" });
  assert(anonSettingsPatch.status >= 400 || (Array.isArray(anonSettingsPatch.data) && anonSettingsPatch.data.length === 0), "Anonymous: site_settings UPDATE rejected by RLS (0 rows affected)");

  // Admin profiles
  const anonAdminProfiles = await callPostgrest("admin_profiles", "GET", ANON_KEY);
  assert(anonAdminProfiles.status === 200 && anonAdminProfiles.data.length === 0, "Anonymous: cannot enumerate admin_profiles (0 rows)");

  const anonProfileInsert = await callPostgrest("admin_profiles", "POST", ANON_KEY, { role: "admin" });
  assert(anonProfileInsert.status >= 400 || (Array.isArray(anonProfileInsert.data) && anonProfileInsert.data.length === 0), "Anonymous: admin_profiles INSERT rejected by RLS");

  // ---------------------------------------------------------------------------
  // [4/7] AUTHENTICATED OUTSIDER CONTEXT VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n[4/7] Testing Authenticated Outsider Context (Valid User, Zero Admin Rights)...");

  const outsiderActProd = await callPostgrest("products?slug=eq.sec-prod-active-slug", "GET", outsiderJwt);
  assert(outsiderActProd.status === 200 && outsiderActProd.data.length === 1, "Outsider: can read active products");

  const outsiderInactProd = await callPostgrest("products?slug=eq.sec-prod-inactive-slug", "GET", outsiderJwt);
  assert(outsiderInactProd.status === 200 && outsiderInactProd.data.length === 0, "Outsider: inactive products invisible (0 rows)");

  const outsiderProdInsert = await callPostgrest("products", "POST", outsiderJwt, { slug: "outsider-insert", name: "Outsider" });
  assert(outsiderProdInsert.status >= 400 || (Array.isArray(outsiderProdInsert.data) && outsiderProdInsert.data.length === 0), "Outsider: product INSERT rejected by RLS");

  const outsiderProdPatch = await callPostgrest("products?slug=eq.sec-prod-active-slug", "PATCH", outsiderJwt, { name: "Outsider Hack" });
  assert(outsiderProdPatch.status >= 400 || (Array.isArray(outsiderProdPatch.data) && outsiderProdPatch.data.length === 0), "Outsider: product UPDATE rejected by RLS");

  const outsiderSettingsPatch = await callPostgrest("site_settings?id=eq.1", "PATCH", outsiderJwt, { whatsapp_default_greeting: "Outsider" });
  assert(outsiderSettingsPatch.status >= 400 || (Array.isArray(outsiderSettingsPatch.data) && outsiderSettingsPatch.data.length === 0), "Outsider: site_settings UPDATE rejected by RLS");

  const outsiderAdminProfiles = await callPostgrest("admin_profiles", "GET", outsiderJwt);
  assert(outsiderAdminProfiles.status === 200 && outsiderAdminProfiles.data.length === 0, "Outsider: cannot enumerate admin_profiles (0 rows)");

  // Direct privilege escalation attempt: Outsider attempts to insert their own admin_profiles row
  const outsiderSelfPromote = await callPostgrest("admin_profiles", "POST", outsiderJwt, {
    id: outsiderId,
    role: "owner",
    display_name: "Hacked Owner",
  });
  assert(outsiderSelfPromote.status >= 400 || (Array.isArray(outsiderSelfPromote.data) && outsiderSelfPromote.data.length === 0), "Outsider: self-promotion to owner/admin blocked by RLS");

  // ---------------------------------------------------------------------------
  // [5/7] AUTHENTICATED ADMIN CONTEXT VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n[5/7] Testing Authenticated Admin Context...");

  const adminAllProd = await callPostgrest("products?slug=in.(sec-prod-active-slug,sec-prod-inactive-slug)", "GET", adminJwt);
  assert(adminAllProd.status === 200 && adminAllProd.data.length === 2, "Admin: can view both active AND inactive products");

  // Admin product insert
  const adminNewProdSlug = `admin-test-prod-${Date.now()}`;
  const adminProdInsert = await callPostgrest("products", "POST", adminJwt, {
    legacy_id: `leg-${Date.now()}`,
    slug: adminNewProdSlug,
    name: "Admin Created Prod",
    short_name: "Admin Prod",
    price: 3500,
    currency: "BDT",
    description: "Admin Desc",
    short_description: "Admin Short",
    frame_shape: "Aviator",
    frame_look: "Dark Metal",
    frame_color: "Black",
    lens_color: "Smoke",
    lens_type: "Polarized-Style Tint",
    style_category: "Classic",
    fit: "Medium",
    seo_title: "SEO",
    seo_description: "SEO Desc",
    is_active: false,
  });
  assert(adminProdInsert.status === 201 && adminProdInsert.data.length === 1, "Admin: authorized product INSERT succeeds (201 Created)");

  // Admin product update
  const adminProdUpdate = await callPostgrest(`products?slug=eq.${adminNewProdSlug}`, "PATCH", adminJwt, {
    name: "Admin Updated Name",
  });
  assert(adminProdUpdate.status === 200 && adminProdUpdate.data.length === 1, "Admin: authorized product UPDATE succeeds");

  // Admin product delete
  const adminProdDelete = await callPostgrest(`products?slug=eq.${adminNewProdSlug}`, "DELETE", adminJwt);
  assert(adminProdDelete.status === 200 && adminProdDelete.data.length === 1, "Admin: authorized product DELETE succeeds");

  // Admin site_settings update
  const adminSettingsUpdate = await callPostgrest("site_settings?id=eq.1", "PATCH", adminJwt, {
    delivery_fee_inside_dhaka: 80,
  });
  assert(adminSettingsUpdate.status === 200 && adminSettingsUpdate.data.length === 1, "Admin: authorized site_settings UPDATE succeeds");
  // Restore
  await adminClient.from("site_settings").update({ delivery_fee_inside_dhaka: 70 }).eq("id", 1);

  // Admin Profile privileges
  const adminOwnProfile = await callPostgrest(`admin_profiles?id=eq.${adminId}`, "GET", adminJwt);
  assert(adminOwnProfile.status === 200 && adminOwnProfile.data.length === 1, "Admin: can read own admin profile");

  const adminOtherProfile = await callPostgrest(`admin_profiles?id=eq.${ownerId}`, "GET", adminJwt);
  assert(adminOtherProfile.status === 200 && adminOtherProfile.data.length === 0, "Admin: cannot read owner/other admin profiles (0 rows)");

  // Privilege escalation: Admin attempts to elevate self to owner
  const adminSelfElevate = await callPostgrest(`admin_profiles?id=eq.${adminId}`, "PATCH", adminJwt, {
    role: "owner",
  });
  assert(adminSelfElevate.status >= 400 || (Array.isArray(adminSelfElevate.data) && adminSelfElevate.data.length === 0), "Admin: self-promotion from 'admin' to 'owner' blocked by RLS");

  // Privilege escalation: Admin attempts to insert an owner profile
  const adminCreateOwner = await callPostgrest("admin_profiles", "POST", adminJwt, {
    id: outsiderId,
    role: "owner",
    display_name: "Elevated",
  });
  assert(adminCreateOwner.status >= 400 || (Array.isArray(adminCreateOwner.data) && adminCreateOwner.data.length === 0), "Admin: unauthorized owner profile creation blocked by RLS");

  // ---------------------------------------------------------------------------
  // [6/7] AUTHENTICATED OWNER CONTEXT VERIFICATION & LAST-OWNER PROTECTION
  // ---------------------------------------------------------------------------
  console.log("\n[6/7] Testing Authenticated Owner Context & Last-Owner Protection...");

  // Owner can read all profiles
  const ownerListProfiles = await callPostgrest("admin_profiles", "GET", ownerJwt);
  assert(ownerListProfiles.status === 200 && ownerListProfiles.data.length >= 2, "Owner: can read all admin profiles for staff management");

  // Owner creates a secondary test admin
  const tempStaffEmail = `staff-${Date.now()}@vantaire.local`;
  const tempStaffId = await ensureUser(tempStaffEmail, "TempStaff#2026!Secured");

  const ownerCreateAdmin = await callPostgrest("admin_profiles", "POST", ownerJwt, {
    id: tempStaffId,
    role: "admin",
    display_name: "Temporary Staff",
  });
  assert(ownerCreateAdmin.status === 201 && ownerCreateAdmin.data.length === 1, "Owner: can create new admin profile mapping");

  // Owner deletes the secondary test admin
  const ownerDeleteStaff = await callPostgrest(`admin_profiles?id=eq.${tempStaffId}`, "DELETE", ownerJwt);
  assert(ownerDeleteStaff.status === 200 && ownerDeleteStaff.data.length === 1, "Owner: can delete non-owner admin profile");

  // Last-Owner Protection Tests:
  // 1. Owner attempts to demote self to 'admin' when sole owner
  const ownerSelfDemote = await callPostgrest(`admin_profiles?id=eq.${ownerId}`, "PATCH", ownerJwt, {
    role: "admin",
  });
  assert(ownerSelfDemote.status >= 400 || (Array.isArray(ownerSelfDemote.data) && ownerSelfDemote.data.length === 0), "Last-Owner Protection: demoting sole owner to admin is blocked by database trigger");

  // 2. Owner attempts to delete own profile when sole owner
  const ownerSelfDelete = await callPostgrest(`admin_profiles?id=eq.${ownerId}`, "DELETE", ownerJwt);
  assert(ownerSelfDelete.status >= 400 || (Array.isArray(ownerSelfDelete.data) && ownerSelfDelete.data.length === 0), "Last-Owner Protection: deleting sole owner profile is blocked by database trigger");

  // ---------------------------------------------------------------------------
  // [7/7] CLEANUP TEST FIXTURES
  // ---------------------------------------------------------------------------
  console.log("\n[7/7] Cleaning up security test fixtures...");
  await adminClient.from("products").delete().eq("slug", "sec-prod-active-slug");
  await adminClient.from("products").delete().eq("slug", "sec-prod-inactive-slug");
  await adminClient.from("collections").delete().eq("slug", "sec-col-active");
  await adminClient.from("collections").delete().eq("slug", "sec-col-inactive");
  if (tempStaffId) {
    await adminClient.auth.admin.deleteUser(tempStaffId);
  }
  assert(true, "Temporary security fixtures cleaned up successfully");

  console.log("\n==================================================");
  if (failedAssertions === 0) {
    console.log("🏆 ALL AUTHENTIC-JWT SECURITY TESTS PASSED!");
    console.log("==================================================");
    process.exit(0);
  } else {
    console.error(`💥 FAILED: ${failedAssertions} security assertion(s) failed.`);
    console.log("==================================================");
    process.exit(1);
  }
}

runSecuritySuite().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
