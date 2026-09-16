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
  throw new Error("Required Supabase credentials missing from environment.");
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

async function callRpc(
  fnName: string,
  token?: string,
  params?: any
) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`;
  const headers: Record<string, string> = {
    apikey: ANON_KEY,
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: params ? JSON.stringify(params) : "{}",
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

async function runCollectionSecurityVerification() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 9 COLLECTION SECURITY VERIFICATION");
  console.log("==================================================");

  const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Pre-cleanup of any previous test fixtures
  await (adminClient.from("collections") as any).delete().like("slug", "phase9sec-%");
  const { data: testObjects } = await adminClient.storage.from("product-media").list("collections");
  const phase9Folders = (testObjects || []).filter((f) => f.name.startsWith("phase9sec-"));
  for (const folder of phase9Folders) {
    const { data: innerFiles } = await adminClient.storage.from("product-media").list(`collections/${folder.name}`);
    if (innerFiles && innerFiles.length > 0) {
      await adminClient.storage.from("product-media").remove(innerFiles.map((f) => `collections/${folder.name}/${f.name}`));
    }
  }

  // ---------------------------------------------------------------------------
  // [1/6] Establishing Authenticated Security Test Contexts
  // ---------------------------------------------------------------------------
  console.log("\n[1/6] Establishing Authenticated Security Test Contexts (Owner, Admin, Outsider)...");
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
        display_name: `${role.toUpperCase()} User`,
      });
    } else {
      await (adminClient.from("admin_profiles") as any).delete().eq("id", userId);
    }

    const authClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password: runtimeSecret,
    });
    if (error || !data.session?.access_token) {
      throw new Error(`Failed to sign in as ${email}: ${error?.message}`);
    }
    return { id: userId, token: data.session.access_token };
  }

  const owner = await ensureUser("owner@vantaire.local", "owner");
  assert(Boolean(owner.token), "Owner JWT acquired");

  const admin = await ensureUser("admin@vantaire.local", "admin");
  assert(Boolean(admin.token), "Admin JWT acquired");

  const outsider = await ensureUser("outsider@vantaire.local");
  assert(Boolean(outsider.token), "Outsider JWT acquired");

  // Sample catalog products for membership tests
  const { data: sampleProducts } = await adminClient
    .from("products")
    .select("id")
    .limit(3);
  const [p0, p1, p2] = (sampleProducts || []).map((p) => p.id);

  // ---------------------------------------------------------------------------
  // [2/6] Anonymous Context RLS Guards & RPC Denials
  // ---------------------------------------------------------------------------
  console.log("\n[2/6] Verifying Anonymous Context RLS Guards & RPC Denials...");
  {
    // Anonymous collections INSERT blocked
    const anonInsert = await callPostgrest("collections", "POST", undefined, {
      name: "Anon Silhouette",
      slug: "anon-silhouette",
      tagline: "Anon Tagline",
      description: "Anon Description",
      is_active: false,
    });
    assert(
      anonInsert.status === 401 || anonInsert.status === 403 || anonInsert.data?.code === "42501",
      "Anonymous: collections INSERT strictly blocked by RLS"
    );

    // Anonymous collections UPDATE blocked
    const anonUpdate = await callPostgrest("collections?slug=eq.aviator", "PATCH", undefined, {
      name: "Hacked Aviator",
    });
    assert(
      anonUpdate.status === 401 || anonUpdate.status === 403 || (Array.isArray(anonUpdate.data) && anonUpdate.data.length === 0),
      "Anonymous: collections UPDATE strictly blocked (0 rows modified)"
    );

    // Anonymous collections DELETE blocked
    const anonDelete = await callPostgrest("collections?slug=eq.aviator", "DELETE", undefined);
    assert(
      anonDelete.status === 401 || anonDelete.status === 403 || anonDelete.data?.code === "42501",
      "Anonymous: collections DELETE strictly blocked"
    );

    // Anonymous product_collections writes blocked
    const anonMemInsert = await callPostgrest("product_collections", "POST", undefined, {
      product_id: p0,
      collection_id: "ce7c80cb-f7cc-5a1e-a5fb-acc8f4e202f6",
      position: 99,
    });
    assert(
      anonMemInsert.status === 401 || anonMemInsert.status === 403 || anonMemInsert.data?.code === "42501",
      "Anonymous: product_collections INSERT strictly blocked by RLS"
    );

    // Anonymous RPC blocked
    const anonRpc = await callRpc("set_collection_products", undefined, {
      p_collection_id: "ce7c80cb-f7cc-5a1e-a5fb-acc8f4e202f6",
      p_product_ids: [p0],
      p_expected_updated_at: new Date().toISOString(),
    });
    assert(
      anonRpc.status === 401 || anonRpc.status === 403 || anonRpc.data?.code === "42501",
      "Anonymous: RPC set_collection_products strictly blocked"
    );
  }

  // ---------------------------------------------------------------------------
  // [3/6] Authenticated Outsider Context RLS Guards & RPC Denials
  // ---------------------------------------------------------------------------
  console.log("\n[3/6] Verifying Authenticated Outsider Context RLS Guards & RPC Denials...");
  {
    // Outsider collections INSERT blocked
    const outInsert = await callPostgrest("collections", "POST", outsider.token, {
      name: "Outsider Silhouette",
      slug: "outsider-silhouette",
      tagline: "Outsider Tagline",
      description: "Outsider Description",
      is_active: false,
    });
    assert(
      outInsert.status === 403 || outInsert.data?.code === "42501",
      "Outsider: collections INSERT strictly blocked by RLS"
    );

    // Outsider collections UPDATE blocked
    const outUpdate = await callPostgrest("collections?slug=eq.aviator", "PATCH", outsider.token, {
      name: "Outsider Modified Aviator",
    });
    assert(
      outUpdate.status === 403 || (Array.isArray(outUpdate.data) && outUpdate.data.length === 0),
      "Outsider: collections UPDATE strictly blocked (0 rows modified)"
    );

    // Outsider collections DELETE blocked
    const outDelete = await callPostgrest("collections?slug=eq.aviator", "DELETE", outsider.token);
    assert(
      outDelete.status === 403 || outDelete.data?.code === "42501",
      "Outsider: collections DELETE strictly blocked"
    );

    // Outsider product_collections INSERT blocked
    const outMemInsert = await callPostgrest("product_collections", "POST", outsider.token, {
      product_id: p0,
      collection_id: "ce7c80cb-f7cc-5a1e-a5fb-acc8f4e202f6",
      position: 99,
    });
    assert(
      outMemInsert.status === 403 || outMemInsert.data?.code === "42501",
      "Outsider: product_collections INSERT strictly blocked by RLS"
    );

    // Outsider RPC blocked with insufficient_privilege
    const outRpc = await callRpc("set_collection_products", outsider.token, {
      p_collection_id: "ce7c80cb-f7cc-5a1e-a5fb-acc8f4e202f6",
      p_product_ids: [p0],
      p_expected_updated_at: new Date().toISOString(),
    });
    assert(
      outRpc.status === 403 || outRpc.data?.code === "42501",
      "Outsider: RPC set_collection_products rejected with insufficient_privilege"
    );
  }

  // ---------------------------------------------------------------------------
  // [4/6] Hard-DELETE Hardening & Active-Insert Policy (Admin & Owner)
  // ---------------------------------------------------------------------------
  console.log("\n[4/6] Verifying Hard-DELETE Restrictions & Direct Active-Insert Policies...");
  const fixtureSlug = `phase9sec-fixture-${Date.now()}`;
  let fixtureId: string = "";

  {
    // Admin creates draft fixture (is_active = false)
    const createDraft = await callPostgrest("collections", "POST", admin.token, {
      name: "Security Fixture Collection",
      slug: fixtureSlug,
      tagline: "Security Fixture",
      description: "Temporary collection fixture for security verification.",
      is_active: false,
    });
    assert(createDraft.status === 201, "Admin: valid inactive draft collection INSERT succeeds (201 Created)");
    fixtureId = createDraft.data?.[0]?.id;

    // Hard-DELETE Test: Admin direct DELETE must fail (privilege revoked)
    const adminDel = await callPostgrest(`collections?id=eq.${fixtureId}`, "DELETE", admin.token);
    assert(
      adminDel.status === 403 || adminDel.data?.code === "42501",
      "Admin: direct collections DELETE blocked (DELETE privilege revoked)"
    );

    // Hard-DELETE Test: Owner direct DELETE must fail
    const ownerDel = await callPostgrest(`collections?id=eq.${fixtureId}`, "DELETE", owner.token);
    assert(
      ownerDel.status === 403 || ownerDel.data?.code === "42501",
      "Owner: direct collections DELETE blocked (DELETE privilege revoked)"
    );

    // Direct Active-Insert Policy Test: Admin is_active = true MUST FAIL RLS WITH CHECK
    const adminActiveInsert = await callPostgrest("collections", "POST", admin.token, {
      name: "Admin Active Insert Attempt",
      slug: `phase9sec-admin-active-${Date.now()}`,
      tagline: "Valid Tagline",
      description: "Valid Description",
      is_active: true,
    });
    assert(
      adminActiveInsert.status === 403 || adminActiveInsert.data?.code === "42501",
      "Admin: direct active collection INSERT blocked strictly by RLS WITH CHECK (is_active = false)"
    );

    // Direct Active-Insert Policy Test: Owner is_active = true MUST FAIL RLS WITH CHECK
    const ownerActiveInsert = await callPostgrest("collections", "POST", owner.token, {
      name: "Owner Active Insert Attempt",
      slug: `phase9sec-owner-active-${Date.now()}`,
      tagline: "Valid Tagline",
      description: "Valid Description",
      is_active: true,
    });
    assert(
      ownerActiveInsert.status === 403 || ownerActiveInsert.data?.code === "42501",
      "Owner: direct active collection INSERT blocked strictly by RLS WITH CHECK (is_active = false)"
    );
  }

  // ---------------------------------------------------------------------------
  // [5/6] Database Triggers: Slug Immutability & Storage Path Guard
  // ---------------------------------------------------------------------------
  console.log("\n[5/6] Testing Database Triggers: Slug Immutability & Storage Path Guard...");
  {
    // Trigger Guard: Slug Immutability on UPDATE
    const mutateSlug = await callPostgrest(`collections?id=eq.${fixtureId}`, "PATCH", admin.token, {
      slug: "mutated-slug-attempt",
    });
    assert(
      mutateSlug.status >= 400 && mutateSlug.data?.code === "23514",
      "DB Trigger: fn_prevent_collection_slug_mutation strictly blocks changing slug"
    );

    // Trigger Guard: Path Traversal (..)
    const traversalAttempt = await callPostgrest(`collections?id=eq.${fixtureId}`, "PATCH", admin.token, {
      cover_image: "collections/../evil.jpg",
    });
    assert(
      traversalAttempt.status >= 400 && traversalAttempt.data?.code === "23514",
      "DB Trigger: fn_guard_collection_cover_storage_path blocks path traversal (..)"
    );

    // Trigger Guard: Backslashes
    const backslashAttempt = await callPostgrest(`collections?id=eq.${fixtureId}`, "PATCH", admin.token, {
      cover_image: "collections\\evil.jpg",
    });
    assert(
      backslashAttempt.status >= 400 && backslashAttempt.data?.code === "23514",
      "DB Trigger: fn_guard_collection_cover_storage_path blocks backslashes"
    );

    // Trigger Guard: External URLs (http/https)
    const urlAttempt = await callPostgrest(`collections?id=eq.${fixtureId}`, "PATCH", admin.token, {
      cover_image: "https://evil.com/cover.jpg",
    });
    assert(
      urlAttempt.status >= 400 && urlAttempt.data?.code === "23514",
      "DB Trigger: fn_guard_collection_cover_storage_path blocks external URLs"
    );

    // Trigger Guard: Products prefix
    const prodPrefixAttempt = await callPostgrest(`collections?id=eq.${fixtureId}`, "PATCH", admin.token, {
      cover_image: "products/some-prod/image-1234567890abcdef.jpg",
    });
    assert(
      prodPrefixAttempt.status >= 400 && prodPrefixAttempt.data?.code === "23514",
      "DB Trigger: fn_guard_collection_cover_storage_path blocks products/ path"
    );

    // Trigger Guard: Mismatched collection slug
    const mismatchSlugAttempt = await callPostgrest(`collections?id=eq.${fixtureId}`, "PATCH", admin.token, {
      cover_image: "collections/other-silhouette/cover-1234567890abcdef.jpg",
    });
    assert(
      mismatchSlugAttempt.status >= 400 && mismatchSlugAttempt.data?.code === "23514",
      "DB Trigger: fn_guard_collection_cover_storage_path blocks mismatched collection slug"
    );

    // Trigger Guard: Nested subdirectories
    const nestedAttempt = await callPostgrest(`collections?id=eq.${fixtureId}`, "PATCH", admin.token, {
      cover_image: `collections/${fixtureSlug}/sub/cover-1234567890abcdef.jpg`,
    });
    assert(
      nestedAttempt.status >= 400 && nestedAttempt.data?.code === "23514",
      "DB Trigger: fn_guard_collection_cover_storage_path blocks nested subdirectories"
    );

    // Trigger Guard: Non-hex filename
    const nonHexAttempt = await callPostgrest(`collections?id=eq.${fixtureId}`, "PATCH", admin.token, {
      cover_image: `collections/${fixtureSlug}/my-photo.jpg`,
    });
    assert(
      nonHexAttempt.status >= 400 && nonHexAttempt.data?.code === "23514",
      "DB Trigger: fn_guard_collection_cover_storage_path blocks non-hex filenames"
    );

    // Trigger Guard: Authenticated user attempting legacy static seed path
    const seedPathAttempt = await callPostgrest(`collections?id=eq.${fixtureId}`, "PATCH", admin.token, {
      cover_image: "/images/collections/collection-aviator.jpg",
    });
    assert(
      seedPathAttempt.status >= 400 && seedPathAttempt.data?.code === "23514",
      "DB Trigger: fn_guard_collection_cover_storage_path blocks authenticated users setting static seed paths"
    );
  }

  // ---------------------------------------------------------------------------
  // [6/6] Membership Position Integrity & Clean Catalog Restoration
  // ---------------------------------------------------------------------------
  console.log("\n[6/6] Testing Position Integrity Triggers & Restoring Catalog Baseline...");
  {
    // Position Constraint: Negative position rejected by check constraint
    const negPos = await callPostgrest("product_collections", "POST", admin.token, {
      product_id: p0,
      collection_id: fixtureId,
      position: -1,
    });
    assert(
      negPos.status >= 400 && negPos.data?.code === "23514",
      "DB Check Constraint: blocks negative product position"
    );

    // Non-existent product ID rejected by foreign key constraint
    const badProd = await callPostgrest("product_collections", "POST", admin.token, {
      product_id: "00000000-0000-0000-0000-000000000000",
      collection_id: fixtureId,
      position: 0,
    });
    assert(
      badProd.status >= 400 && badProd.data?.code === "23503",
      "DB Foreign Key: blocks non-existent product UUID"
    );

    // Valid positive control: Owner RPC set_collection_products
    const { data: currentFixture } = await adminClient
      .from("collections")
      .select("updated_at")
      .eq("id", fixtureId)
      .single();

    const ownerRpc = await callRpc("set_collection_products", owner.token, {
      p_collection_id: fixtureId,
      p_product_ids: [p0, p1],
      p_expected_updated_at: currentFixture?.updated_at,
    });
    assert(ownerRpc.status === 200, "Owner: RPC set_collection_products succeeds");

    // Clean up temporary security fixtures
    await (adminClient.from("product_collections") as any).delete().eq("collection_id", fixtureId);
    await (adminClient.from("collections") as any).delete().eq("id", fixtureId);

    // Verify Clean Baseline Restoration
    const { count: prodCount } = await adminClient.from("products").select("*", { count: "exact", head: true });
    const { count: activeProdCount } = await adminClient.from("products").select("*", { count: "exact", head: true }).eq("is_active", true);
    const { count: colCount } = await adminClient.from("collections").select("*", { count: "exact", head: true });
    const { count: activeColCount } = await adminClient.from("collections").select("*", { count: "exact", head: true }).eq("is_active", true);
    const { count: memberCount } = await adminClient.from("product_collections").select("*", { count: "exact", head: true });
    const { count: imgCount } = await adminClient.from("product_images").select("*", { count: "exact", head: true });

    assert(prodCount === 42, `Clean baseline: exactly 42 products in database (got ${prodCount})`);
    assert(activeProdCount === 42, `Clean baseline: exactly 42 active products (got ${activeProdCount})`);
    assert(colCount === 6, `Clean baseline: exactly 6 collections in database (got ${colCount})`);
    assert(activeColCount === 6, `Clean baseline: exactly 6 active collections (got ${activeColCount})`);
    assert(memberCount === 63, `Clean baseline: exactly 63 product_collections (got ${memberCount})`);
    assert(imgCount === 42, `Clean baseline: exactly 42 product_images (got ${imgCount})`);
  }

  console.log("\n==================================================");
  console.log(`Assertions Passed: ${passed}`);
  console.log(`Assertions Failed: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    console.error(`❌ ${failed} ASSERTIONS FAILED`);
    process.exit(1);
  } else {
    console.log("🎉 ALL PHASE 9 COLLECTION SECURITY CHECKS PASSED!");
  }
}

runCollectionSecurityVerification().catch((err) => {
  console.error("Fatal error running Phase 9 collection security verification:", err);
  process.exit(1);
});
