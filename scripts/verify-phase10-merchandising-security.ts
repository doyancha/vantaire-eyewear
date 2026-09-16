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

async function runMerchandisingSecurityVerification() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 10 MERCHANDISING SECURITY VERIFICATION");
  console.log("==================================================");

  const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Clean any residual test fixtures
  await (adminClient.from("products") as any).delete().like("slug", "phase10-%");
  await (adminClient.from("collections") as any).delete().like("slug", "phase10-%");

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
      userId = created.user?.id;
    } else {
      await adminClient.auth.admin.updateUserById(userId, { password: runtimeSecret });
    }

    if (role && userId) {
      await (adminClient.from("admin_profiles") as any).upsert({
        id: userId,
        role,
        display_name: `${role.toUpperCase()} User`,
      });
    }

    const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error } = await client.auth.signInWithPassword({
      email,
      password: runtimeSecret,
    });

    if (error || !authData.session?.access_token) {
      throw new Error(`Failed to log in as ${email}: ${error?.message}`);
    }

    return { id: userId!, token: authData.session.access_token, client };
  }

  const owner = await ensureUser("owner@vantaire.test", "owner");
  const admin = await ensureUser("admin@vantaire.test", "admin");
  const outsider = await ensureUser("outsider@vantaire.test");

  assert(!!owner.token, "Owner JWT acquired");
  assert(!!admin.token, "Admin JWT acquired");
  assert(!!outsider.token, "Outsider JWT acquired");

  // Fetch a canonical active product
  const { data: sampleProduct } = await adminClient
    .from("products")
    .select("id, slug, featured, sort_order, updated_at")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!sampleProduct) throw new Error("No active canonical product found.");

  // Fetch canonical products & collections for RPC tests
  const { data: allProds } = await adminClient
    .from("products")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });
  const prodIds = allProds?.map((p) => p.id) || [];

  const { data: allCols } = await adminClient
    .from("collections")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });
  const colIds = allCols?.map((c) => c.id) || [];

  // ---------------------------------------------------------------------------
  // [2/6] Verifying Anonymous Context RLS Guards & RPC Denials
  // ---------------------------------------------------------------------------
  console.log("\n[2/6] Verifying Anonymous Context RLS Guards & RPC Denials...");
  {
    // Anonymous: direct product merchandising UPDATE rejected
    const anonPatch = await callPostgrest(`products?id=eq.${sampleProduct.id}`, "PATCH", undefined, {
      featured: !sampleProduct.featured,
    });
    assert(
      anonPatch.status === 200 && Array.isArray(anonPatch.data) && anonPatch.data.length === 0,
      "Anonymous: products UPDATE strictly blocked by RLS (0 rows modified)"
    );

    // Anonymous: RPC reorder_products blocked
    const anonReorderProds = await callRpc("reorder_products", undefined, {
      p_ordered_ids: prodIds,
      p_expected_order: prodIds,
    });
    assert(
      anonReorderProds.status >= 400,
      "Anonymous: RPC reorder_products strictly blocked"
    );

    // Anonymous: RPC reorder_collections blocked
    const anonReorderCols = await callRpc("reorder_collections", undefined, {
      p_ordered_ids: colIds,
      p_expected_order: colIds,
    });
    assert(
      anonReorderCols.status >= 400,
      "Anonymous: RPC reorder_collections strictly blocked"
    );
  }

  // ---------------------------------------------------------------------------
  // [3/6] Verifying Authenticated Outsider Context RLS Guards & RPC Denials
  // ---------------------------------------------------------------------------
  console.log("\n[3/6] Verifying Authenticated Outsider Context RLS Guards & RPC Denials...");
  {
    // Outsider: direct product merchandising UPDATE rejected
    const outsiderPatch = await callPostgrest(`products?id=eq.${sampleProduct.id}`, "PATCH", outsider.token, {
      featured: !sampleProduct.featured,
    });
    assert(
      outsiderPatch.status === 200 && Array.isArray(outsiderPatch.data) && outsiderPatch.data.length === 0,
      "Outsider: products UPDATE strictly blocked by RLS (0 rows modified)"
    );

    // Outsider: RPC reorder_products rejected with insufficient_privilege
    const outsiderReorderProds = await callRpc("reorder_products", outsider.token, {
      p_ordered_ids: prodIds,
      p_expected_order: prodIds,
    });
    assert(
      outsiderReorderProds.status >= 400 && outsiderReorderProds.data?.code === "42501",
      "Outsider: RPC reorder_products rejected with insufficient_privilege"
    );

    // Outsider: RPC reorder_collections rejected with insufficient_privilege
    const outsiderReorderCols = await callRpc("reorder_collections", outsider.token, {
      p_ordered_ids: colIds,
      p_expected_order: colIds,
    });
    assert(
      outsiderReorderCols.status >= 400 && outsiderReorderCols.data?.code === "42501",
      "Outsider: RPC reorder_collections rejected with insufficient_privilege"
    );
  }

  // ---------------------------------------------------------------------------
  // [4/6] Verifying Inactive Product Merchandising Constraints
  // ---------------------------------------------------------------------------
  console.log("\n[4/6] Verifying Inactive Product Merchandising DB Constraints...");
  const tempFixtureSlug = `phase10-sec-prod-${Date.now()}`;
  let tempFixtureId: string = "";

  {
    // Admin creates valid inactive product
    const createRes = await callPostgrest("products", "POST", admin.token, {
      slug: tempFixtureSlug,
      name: "Phase 10 Security Inactive Test",
      short_name: "Sec Inactive",
      category: "Sunglasses",
      gender: "Unisex",
      price: 11000,
      compare_at_price: 14000,
      currency: "BDT",
      currency_symbol: "৳",
      description: "Testing inactive merchandising database constraint.",
      short_description: "Short desc.",
      frame_shape: "Square",
      frame_look: "Classic Acetate",
      frame_color: "Matte Obsidian Black",
      lens_color: "Deep Charcoal Tint",
      lens_type: "Polarized-Style Tint",
      style_category: "Architectural",
      fit: "Universal",
      features: ["Handcrafted in Japan"],
      in_stock: true,
      is_active: false,
      featured: false,
      best_seller: false,
      new_arrival: false,
      seo_title: "Phase 10 Security Inactive Test",
      seo_description: "Phase 10 Security Inactive Test Description",
    });

    assert(createRes.status === 201 && !!createRes.data?.[0]?.id, "Admin: created inactive product fixture");
    tempFixtureId = createRes.data[0].id;

    // Admin tries setting featured = true on inactive product -> BLOCKED BY DB CONSTRAINT
    const adminInactiveFeatured = await callPostgrest(`products?id=eq.${tempFixtureId}`, "PATCH", admin.token, {
      featured: true,
    });
    assert(
      adminInactiveFeatured.status >= 400 && adminInactiveFeatured.data?.code === "23514",
      "Admin: setting featured = true on inactive product strictly blocked by chk_products_inactive_merchandising"
    );

    // Owner tries setting best_seller = true on inactive product -> BLOCKED BY DB CONSTRAINT
    const ownerInactiveBest = await callPostgrest(`products?id=eq.${tempFixtureId}`, "PATCH", owner.token, {
      best_seller: true,
    });
    assert(
      ownerInactiveBest.status >= 400 && ownerInactiveBest.data?.code === "23514",
      "Owner: setting best_seller = true on inactive product strictly blocked by chk_products_inactive_merchandising"
    );

    // Admin tries setting new_arrival = true on inactive product -> BLOCKED BY DB CONSTRAINT
    const adminInactiveNew = await callPostgrest(`products?id=eq.${tempFixtureId}`, "PATCH", admin.token, {
      new_arrival: true,
    });
    assert(
      adminInactiveNew.status >= 400 && adminInactiveNew.data?.code === "23514",
      "Admin: setting new_arrival = true on inactive product strictly blocked by chk_products_inactive_merchandising"
    );
  }

  // ---------------------------------------------------------------------------
  // [5/6] Verifying Sort Order Integrity: Unique & Contiguous Constraints
  // ---------------------------------------------------------------------------
  console.log("\n[5/6] Testing Sort Order Integrity Triggers & Constraints...");
  {
    // Duplicate Product Position Attack: Trying to set sort_order to an existing position (e.g. 0)
    const dupProdAttempt = await callPostgrest(`products?id=eq.${tempFixtureId}`, "PATCH", admin.token, {
      sort_order: 0,
    });
    assert(
      dupProdAttempt.status >= 400 && (dupProdAttempt.data?.code === "23505" || dupProdAttempt.data?.code === "23514"),
      "DB Constraint: duplicate product sort_order strictly blocked (uq_products_sort_order)"
    );

    // Negative Product Position Attack
    const negProdAttempt = await callPostgrest(`products?id=eq.${tempFixtureId}`, "PATCH", admin.token, {
      sort_order: -5,
    });
    assert(
      negProdAttempt.status >= 400 && negProdAttempt.data?.code === "23514",
      "DB Constraint: negative product sort_order strictly blocked (chk_products_sort_order_nonnegative)"
    );

    // Duplicate Collection Position Attack
    const dupColAttempt = await callPostgrest(`collections?id=eq.${colIds[1]}`, "PATCH", admin.token, {
      sort_order: 0,
    });
    assert(
      dupColAttempt.status >= 400 && (dupColAttempt.data?.code === "23505" || dupColAttempt.data?.code === "23514"),
      "DB Constraint: duplicate collection sort_order strictly blocked (uq_collections_sort_order)"
    );

    // Negative Collection Position Attack
    const negColAttempt = await callPostgrest(`collections?id=eq.${colIds[1]}`, "PATCH", admin.token, {
      sort_order: -5,
    });
    assert(
      negColAttempt.status >= 400 && negColAttempt.data?.code === "23514",
      "DB Constraint: negative collection sort_order strictly blocked (chk_collections_sort_order_nonnegative)"
    );
  }

  // Clean test fixtures
  await (adminClient.from("products") as any).delete().eq("id", tempFixtureId);

  // ---------------------------------------------------------------------------
  // [6/6] Testing Owner & Admin Positive Control Matrix
  // ---------------------------------------------------------------------------
  console.log("\n[6/6] Testing Owner & Admin Positive Controls (Reorder & Flag Mutations)...");
  {
    const originalFeatured = sampleProduct.featured;

    // Admin: update merchandising flag on active product succeeds
    const adminUpdate = await callPostgrest(`products?id=eq.${sampleProduct.id}`, "PATCH", admin.token, {
      featured: !originalFeatured,
    });
    assert(adminUpdate.status === 200 && adminUpdate.data?.[0]?.featured === !originalFeatured, "Admin: flag update succeeds");

    // Owner: update merchandising flag on active product succeeds (revert to original)
    const ownerUpdate = await callPostgrest(`products?id=eq.${sampleProduct.id}`, "PATCH", owner.token, {
      featured: originalFeatured,
    });
    assert(ownerUpdate.status === 200 && ownerUpdate.data?.[0]?.featured === originalFeatured, "Owner: flag update succeeds");

    // Admin: RPC reorder_products succeeds
    const adminReorderProds = await callRpc("reorder_products", admin.token, {
      p_ordered_ids: prodIds,
      p_expected_order: prodIds,
    });
    assert(adminReorderProds.status === 200 && adminReorderProds.data?.[0]?.success === true, "Admin: RPC reorder_products succeeds");

    // Owner: RPC reorder_products succeeds
    const ownerReorderProds = await callRpc("reorder_products", owner.token, {
      p_ordered_ids: prodIds,
      p_expected_order: prodIds,
    });
    assert(ownerReorderProds.status === 200 && ownerReorderProds.data?.[0]?.success === true, "Owner: RPC reorder_products succeeds");

    // Admin: RPC reorder_collections succeeds
    const adminReorderCols = await callRpc("reorder_collections", admin.token, {
      p_ordered_ids: colIds,
      p_expected_order: colIds,
    });
    assert(adminReorderCols.status === 200 && adminReorderCols.data?.[0]?.success === true, "Admin: RPC reorder_collections succeeds");

    // Owner: RPC reorder_collections succeeds
    const ownerReorderCols = await callRpc("reorder_collections", owner.token, {
      p_ordered_ids: colIds,
      p_expected_order: colIds,
    });
    assert(ownerReorderCols.status === 200 && ownerReorderCols.data?.[0]?.success === true, "Owner: RPC reorder_collections succeeds");

    // Verify baseline counts
    const { count: finalProdCount } = await adminClient.from("products").select("*", { count: "exact", head: true });
    assert(finalProdCount === 42, `Clean baseline: exactly 42 products in database (got ${finalProdCount})`);

    const { count: finalColCount } = await adminClient.from("collections").select("*", { count: "exact", head: true });
    assert(finalColCount === 6, `Clean baseline: exactly 6 collections in database (got ${finalColCount})`);

    const { count: finalFeaturedCount } = await adminClient.from("products").select("*", { count: "exact", head: true }).eq("featured", true);
    assert(finalFeaturedCount === 15, `Clean baseline: exactly 15 featured products (got ${finalFeaturedCount})`);

    const { count: finalBestCount } = await adminClient.from("products").select("*", { count: "exact", head: true }).eq("best_seller", true);
    assert(finalBestCount === 15, `Clean baseline: exactly 15 best sellers (got ${finalBestCount})`);

    const { count: finalNewCount } = await adminClient.from("products").select("*", { count: "exact", head: true }).eq("new_arrival", true);
    assert(finalNewCount === 22, `Clean baseline: exactly 22 new arrivals (got ${finalNewCount})`);
  }

  // Summary
  console.log("\n==================================================");
  console.log(`Assertions Passed: ${passed}`);
  console.log(`Assertions Failed: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    throw new Error(`${failed} assertion(s) failed in Phase 10 security verification.`);
  } else {
    console.log("🎉 ALL PHASE 10 MERCHANDISING SECURITY CHECKS PASSED!\n");
  }
}

runMerchandisingSecurityVerification().catch((err) => {
  console.error("FATAL ERROR in Phase 10 Merchandising Security Verification:", err);
  process.exit(1);
});
