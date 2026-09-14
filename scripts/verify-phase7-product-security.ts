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

if (!ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error("Required Supabase credentials missing from environment / .env.local");
}

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

async function callPostgrest(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  token?: string,
  body?: any
) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers: Record<string, string> = {
    apikey: ANON_KEY,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

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

async function runProductSecurityVerification() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 7 PRODUCT SECURITY VERIFICATION");
  console.log("==================================================");

  const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Establish authentic identities
  console.log("\n[1/5] Establishing Authenticated Security Test Contexts...");
  const runtimeSecret = crypto.randomBytes(16).toString("hex") + "!Aa1";

  async function ensureUser(email: string, role?: "owner" | "admin") {
    const { data: listData } = await adminClient.auth.admin.listUsers();
    let userId = listData?.users.find((u) => u.email === email)?.id;

    if (!userId) {
      const { data: created } = await adminClient.auth.admin.createUser({
        email,
        password: runtimeSecret,
        email_confirm: true,
      });
      userId = created.user!.id;
    } else {
      await adminClient.auth.admin.updateUserById(userId, { password: runtimeSecret });
    }

    if (role) {
      await (adminClient.from("admin_profiles") as any).upsert({
        id: userId,
        role,
        display_name: `Security ${role}`,
      });
    }

    return userId;
  }

  const ownerId = await ensureUser("owner@vantaire.local", "owner");
  const adminId = await ensureUser("admin@vantaire.local", "admin");
  const outsiderId = await ensureUser("outsider@vantaire.local");

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: ownerAuth } = await authClient.auth.signInWithPassword({
    email: "owner@vantaire.local",
    password: runtimeSecret,
  });
  const ownerJwt = ownerAuth.session?.access_token!;

  const { data: adminAuth } = await authClient.auth.signInWithPassword({
    email: "admin@vantaire.local",
    password: runtimeSecret,
  });
  const adminJwt = adminAuth.session?.access_token!;

  const { data: outsiderAuth } = await authClient.auth.signInWithPassword({
    email: "outsider@vantaire.local",
    password: runtimeSecret,
  });
  const outsiderJwt = outsiderAuth.session?.access_token!;

  assert(Boolean(ownerJwt && adminJwt && outsiderJwt), "Authentic JWTs acquired for Owner, Admin, and Outsider");

  // Create temporary inactive fixture to verify visibility
  const tempFixtureSlug = `sec-phase7-inactive-${Date.now()}`;
  const { error: insFixtureErr } = await (adminClient.from("products") as any).insert({
    slug: tempFixtureSlug,
    legacy_id: `vnt-sec-${Date.now()}`,
    name: "Security Temp Inactive",
    short_name: "Sec Inactive",
    category: "Sunglasses",
    gender: "Unisex",
    price: 3000,
    currency: "BDT",
    currency_symbol: "৳",
    description: "Temp description",
    short_description: "Temp short",
    frame_shape: "Aviator",
    frame_look: "Metal",
    frame_color: "Black",
    lens_color: "Smoke",
    lens_type: "Polarized-Style Tint",
    style_category: "Classic",
    fit: "Universal",
    features: ["Feature 1"],
    seo_title: "Sec Title",
    seo_description: "Sec Description",
    is_active: false,
  });
  if (insFixtureErr) throw insFixtureErr;

  // 2. Anonymous context verification
  console.log("\n[2/5] Verifying Anonymous Context RLS Guards...");
  const anonGetInactive = await callPostgrest(`products?slug=eq.${tempFixtureSlug}`, "GET");
  assert(
    anonGetInactive.status === 200 && anonGetInactive.data.length === 0,
    "Anonymous: inactive products are completely hidden under RLS (0 rows returned)"
  );

  const anonInsert = await callPostgrest("products", "POST", undefined, {
    slug: "anon-unauthorized-insert",
    name: "Anon Product",
  });
  assert(
    anonInsert.status >= 400 || (Array.isArray(anonInsert.data) && anonInsert.data.length === 0),
    "Anonymous: product INSERT rejected by RLS"
  );

  const anonDelete = await callPostgrest(`products?slug=eq.${tempFixtureSlug}`, "DELETE");
  assert(
    anonDelete.status >= 400 || (Array.isArray(anonDelete.data) && anonDelete.data.length === 0),
    "Anonymous: product hard DELETE rejected by RLS / permissions"
  );

  // 3. Outsider context verification
  console.log("\n[3/5] Verifying Authenticated Outsider Context RLS Guards...");
  const outsiderGetInactive = await callPostgrest(`products?slug=eq.${tempFixtureSlug}`, "GET", outsiderJwt);
  assert(
    outsiderGetInactive.status === 200 && outsiderGetInactive.data.length === 0,
    "Outsider: inactive products are completely hidden under RLS"
  );

  const outsiderInsert = await callPostgrest("products", "POST", outsiderJwt, {
    slug: "outsider-unauthorized-insert",
    name: "Outsider Product",
  });
  assert(
    outsiderInsert.status >= 400 || (Array.isArray(outsiderInsert.data) && outsiderInsert.data.length === 0),
    "Outsider: product INSERT rejected by RLS"
  );

  const outsiderUpdate = await callPostgrest(
    "products?slug=eq.noir-sovereign-aviator",
    "PATCH",
    outsiderJwt,
    { price: 100 }
  );
  assert(
    outsiderUpdate.status >= 400 || (Array.isArray(outsiderUpdate.data) && outsiderUpdate.data.length === 0),
    "Outsider: product UPDATE rejected by RLS"
  );

  const outsiderDelete = await callPostgrest(
    "products?slug=eq.noir-sovereign-aviator",
    "DELETE",
    outsiderJwt
  );
  assert(
    outsiderDelete.status >= 400 || (Array.isArray(outsiderDelete.data) && outsiderDelete.data.length === 0),
    "Outsider: product DELETE rejected by RLS / permissions"
  );

  // 4. Authenticated Admin Context Verification
  console.log("\n[4/5] Verifying Authenticated Admin Context & Trigger Guarantees...");
  const adminGetInactive = await callPostgrest(`products?slug=eq.${tempFixtureSlug}`, "GET", adminJwt);
  assert(
    adminGetInactive.status === 200 && adminGetInactive.data.length === 1,
    "Admin: can view inactive products under RLS"
  );

  // Admin insert without legacy_id -> auto-generation trigger test
  const adminTestSlug = `admin-sec-prod-${Date.now()}`;
  const adminInsert = await callPostgrest("products", "POST", adminJwt, {
    slug: adminTestSlug,
    name: "Admin Auto Legacy Test",
    short_name: "Auto Legacy",
    category: "Sunglasses",
    gender: "Unisex",
    price: 3950,
    currency: "BDT",
    currency_symbol: "৳",
    description: "Testing automatic legacy ID assignment",
    short_description: "Auto legacy test",
    frame_shape: "Square",
    frame_look: "Acetate",
    frame_color: "Tortoise",
    lens_color: "Brown",
    lens_type: "Gradient Tint",
    style_category: "Contemporary",
    fit: "Universal",
    features: ["Feature A", "Feature B"],
    seo_title: "Auto Legacy Test",
    seo_description: "Auto legacy description",
    is_active: false,
  });

  assert(
    adminInsert.status === 201 && adminInsert.data.length === 1,
    "Admin: product INSERT succeeds under RLS"
  );

  const insertedProd = adminInsert.data[0];
  const legacyIdValid = typeof insertedProd?.legacy_id === "string" && /^vnt-\d+$/.test(insertedProd.legacy_id);
  assert(
    legacyIdValid,
    `Admin: legacy_id auto-generated monotonically (${insertedProd?.legacy_id}) via DB trigger`
  );

  // Admin update mutable field
  const adminUpdate = await callPostgrest(
    `products?id=eq.${insertedProd.id}`,
    "PATCH",
    adminJwt,
    { name: "Admin Renamed Test" }
  );
  assert(
    adminUpdate.status === 200 && adminUpdate.data[0]?.name === "Admin Renamed Test",
    "Admin: authorized UPDATE of mutable fields succeeds"
  );

  // Admin attempt to mutate slug -> MUST FAIL at trigger
  const adminMutateSlug = await callPostgrest(
    `products?id=eq.${insertedProd.id}`,
    "PATCH",
    adminJwt,
    { slug: "mutated-slug-attempt" }
  );
  assert(
    adminMutateSlug.status >= 400 &&
      (adminMutateSlug.data?.message?.includes("immutable") ||
        adminMutateSlug.data?.details?.includes("immutable")),
    "DB Trigger: mutating product 'slug' is strictly blocked (check_violation: immutable once created)"
  );

  // Admin attempt to mutate legacy_id -> MUST FAIL at trigger
  const adminMutateLegacy = await callPostgrest(
    `products?id=eq.${insertedProd.id}`,
    "PATCH",
    adminJwt,
    { legacy_id: "vnt-999" }
  );
  assert(
    adminMutateLegacy.status >= 400 &&
      (adminMutateLegacy.data?.message?.includes("immutable") ||
        adminMutateLegacy.data?.details?.includes("immutable")),
    "DB Trigger: mutating product 'legacy_id' is strictly blocked (check_violation: immutable once created)"
  );

  // Admin attempt to HARD DELETE product -> MUST FAIL
  const adminHardDelete = await callPostgrest(
    `products?id=eq.${insertedProd.id}`,
    "DELETE",
    adminJwt
  );
  assert(
    adminHardDelete.status >= 400 || (Array.isArray(adminHardDelete.data) && adminHardDelete.data.length === 0),
    "Database RLS & Grants: Hard DELETE on public.products is blocked for Authenticated Admins"
  );

  // 5. Cleanup and Baseline Verification
  console.log("\n[5/5] Cleaning Up Fixtures & Verifying Clean Baseline...");
  await (adminClient.from("products") as any).delete().eq("slug", tempFixtureSlug);
  await (adminClient.from("products") as any).delete().eq("id", insertedProd.id);

  const { count: finalCount } = await adminClient
    .from("products")
    .select("id", { count: "exact", head: true });

  const { count: activeCount } = await adminClient
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  assert(finalCount === 42, `Clean baseline: exactly 42 products in database (got ${finalCount})`);
  assert(activeCount === 42, `Clean baseline: exactly 42 active products in database (got ${activeCount})`);

  console.log("\n==================================================");
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} PHASE 7 PRODUCT SECURITY ASSERTIONS PASSED!`);
    console.log("==================================================");
    process.exit(0);
  } else {
    console.error(`💥 FAILED: ${failed} product security assertion(s) failed.`);
    console.log("==================================================");
    process.exit(1);
  }
}

runProductSecurityVerification().catch((err) => {
  console.error("FATAL VERIFICATION ERROR:", err);
  process.exit(1);
});
