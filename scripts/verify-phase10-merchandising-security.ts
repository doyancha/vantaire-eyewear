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

    // -------------------------------------------------------------------------
    // [6.1] Mandatory Snapshot Verification (Prevent Direct Call Bypass)
    // -------------------------------------------------------------------------
    console.log("\n[6.1] Verifying Mandatory Reorder Snapshot Enforcement...");
    // Admin: reorder_products with NULL expected snapshot -> BLOCKED
    const adminNullProdSnap = await callRpc("reorder_products", admin.token, {
      p_ordered_ids: prodIds,
      p_expected_order: null,
    });
    assert(
      adminNullProdSnap.status >= 400 &&
        (adminNullProdSnap.data?.message?.includes("mandatory") || adminNullProdSnap.data?.details?.includes("mandatory") || adminNullProdSnap.data?.code === "23514"),
      "Admin: reorder_products with NULL expected snapshot strictly BLOCKED"
    );

    // Admin: reorder_products omitting expected snapshot -> BLOCKED
    const adminOmitProdSnap = await callRpc("reorder_products", admin.token, {
      p_ordered_ids: prodIds,
    });
    assert(
      adminOmitProdSnap.status >= 400 &&
        (adminOmitProdSnap.data?.message?.includes("mandatory") || adminOmitProdSnap.data?.details?.includes("mandatory") || adminOmitProdSnap.data?.code === "23514"),
      "Admin: reorder_products omitting expected snapshot strictly BLOCKED"
    );

    // Owner: reorder_products with NULL expected snapshot -> BLOCKED
    const ownerNullProdSnap = await callRpc("reorder_products", owner.token, {
      p_ordered_ids: prodIds,
      p_expected_order: null,
    });
    assert(
      ownerNullProdSnap.status >= 400 &&
        (ownerNullProdSnap.data?.message?.includes("mandatory") || ownerNullProdSnap.data?.details?.includes("mandatory") || ownerNullProdSnap.data?.code === "23514"),
      "Owner: reorder_products with NULL expected snapshot strictly BLOCKED"
    );

    // Admin: reorder_collections with NULL expected snapshot -> BLOCKED
    const adminNullColSnap = await callRpc("reorder_collections", admin.token, {
      p_ordered_ids: colIds,
      p_expected_order: null,
    });
    assert(
      adminNullColSnap.status >= 400 &&
        (adminNullColSnap.data?.message?.includes("mandatory") || adminNullColSnap.data?.details?.includes("mandatory") || adminNullColSnap.data?.code === "23514"),
      "Admin: reorder_collections with NULL expected snapshot strictly BLOCKED"
    );

    // Admin: reorder_collections omitting expected snapshot -> BLOCKED
    const adminOmitColSnap = await callRpc("reorder_collections", admin.token, {
      p_ordered_ids: colIds,
    });
    assert(
      adminOmitColSnap.status >= 400 &&
        (adminOmitColSnap.data?.message?.includes("mandatory") || adminOmitColSnap.data?.details?.includes("mandatory") || adminOmitColSnap.data?.code === "23514"),
      "Admin: reorder_collections omitting expected snapshot strictly BLOCKED"
    );

    // Owner: reorder_collections with NULL expected snapshot -> BLOCKED
    const ownerNullColSnap = await callRpc("reorder_collections", owner.token, {
      p_ordered_ids: colIds,
      p_expected_order: null,
    });
    assert(
      ownerNullColSnap.status >= 400 &&
        (ownerNullColSnap.data?.message?.includes("mandatory") || ownerNullColSnap.data?.details?.includes("mandatory") || ownerNullColSnap.data?.code === "23514"),
      "Owner: reorder_collections with NULL expected snapshot strictly BLOCKED"
    );

    // -------------------------------------------------------------------------
    // [6.2] True Concurrent Reorder Race (Snapshot Concurrency & Zero Lost Updates)
    // -------------------------------------------------------------------------
    console.log("\n[6.2] Testing True Concurrent Reorder Race (Products & Collections)...");
    {
      // Fetch fresh product order
      const { data: currentProds } = await adminClient
        .from("products")
        .select("id")
        .order("sort_order", { ascending: true });
      const currentProdOrder = currentProds?.map((p) => p.id) || [];

      // Plan two divergent reorders based on the identical current snapshot
      const orderA = [...currentProdOrder];
      const tempA = orderA[0];
      orderA[0] = orderA[1];
      orderA[1] = tempA;

      const orderB = [...currentProdOrder];
      const tempB = orderB[2];
      orderB[2] = orderB[3];
      orderB[3] = tempB;

      // Launch both reorders simultaneously with the same expected snapshot
      const [resA, resB] = await Promise.all([
        callRpc("reorder_products", admin.token, {
          p_ordered_ids: orderA,
          p_expected_order: currentProdOrder,
        }),
        callRpc("reorder_products", owner.token, {
          p_ordered_ids: orderB,
          p_expected_order: currentProdOrder,
        }),
      ]);

      const successCount = (resA.status === 200 ? 1 : 0) + (resB.status === 200 ? 1 : 0);
      const conflictCount = (resA.status >= 400 ? 1 : 0) + (resB.status >= 400 ? 1 : 0);

      assert(successCount === 1, "Concurrent product reorder: exactly one transaction succeeded (got 1)");
      assert(conflictCount === 1, "Concurrent product reorder: exactly one transaction failed with conflict (got 1)");

      // Verify the resulting DB order matches the successful transaction exactly (zero lost updates)
      const winningOrder = resA.status === 200 ? orderA : orderB;
      const { data: postRaceProds } = await adminClient
        .from("products")
        .select("id, sort_order")
        .order("sort_order", { ascending: true });
      const postRaceIds = postRaceProds?.map((p) => p.id) || [];

      const exactMatch = postRaceIds.every((id, idx) => id === winningOrder[idx]);
      assert(exactMatch, "Concurrent product reorder: resulting order perfectly matches winner with 0 lost updates");

      // Check contiguity & uniqueness post-race
      const distinctSorts = new Set(postRaceProds?.map((p) => p.sort_order)).size;
      assert(distinctSorts === 42, "Concurrent product reorder: all 42 positions remain unique and contiguous");

      // Restore canonical product order
      await callRpc("reorder_products", admin.token, {
        p_ordered_ids: prodIds,
        p_expected_order: postRaceIds,
      });

      // Repeat for Collections
      const { data: currentCols } = await adminClient
        .from("collections")
        .select("id")
        .order("sort_order", { ascending: true });
      const currentColOrder = currentCols?.map((c) => c.id) || [];

      const colOrderA = [...currentColOrder];
      const colTempA = colOrderA[0];
      colOrderA[0] = colOrderA[1];
      colOrderA[1] = colTempA;

      const colOrderB = [...currentColOrder];
      const colTempB = colOrderB[2];
      colOrderB[2] = colOrderB[3];
      colOrderB[3] = colTempB;

      const [colResA, colResB] = await Promise.all([
        callRpc("reorder_collections", admin.token, {
          p_ordered_ids: colOrderA,
          p_expected_order: currentColOrder,
        }),
        callRpc("reorder_collections", owner.token, {
          p_ordered_ids: colOrderB,
          p_expected_order: currentColOrder,
        }),
      ]);

      const colSuccessCount = (colResA.status === 200 ? 1 : 0) + (colResB.status === 200 ? 1 : 0);
      const colConflictCount = (colResA.status >= 400 ? 1 : 0) + (colResB.status >= 400 ? 1 : 0);

      assert(colSuccessCount === 1, "Concurrent collection reorder: exactly one transaction succeeded (got 1)");
      assert(colConflictCount === 1, "Concurrent collection reorder: exactly one transaction failed with conflict (got 1)");

      const winningColOrder = colResA.status === 200 ? colOrderA : colOrderB;
      const { data: postRaceCols } = await adminClient
        .from("collections")
        .select("id, sort_order")
        .order("sort_order", { ascending: true });
      const postRaceColIds = postRaceCols?.map((c) => c.id) || [];

      const colExactMatch = postRaceColIds.every((id, idx) => id === winningColOrder[idx]);
      assert(colExactMatch, "Concurrent collection reorder: resulting order perfectly matches winner with 0 lost updates");

      // Restore canonical collection order
      await callRpc("reorder_collections", admin.token, {
        p_ordered_ids: colIds,
        p_expected_order: postRaceColIds,
      });
    }

    // -------------------------------------------------------------------------
    // [6.3] Concurrent Sort Allocation via Advisory Locks
    // -------------------------------------------------------------------------
    console.log("\n[6.3] Testing Concurrent Sort Order Allocation (Products & Collections)...");
    {
      const slugP1 = `phase10-conc-prod-1-${Date.now()}`;
      const slugP2 = `phase10-conc-prod-2-${Date.now()}`;

      const prodPayload = (slug: string, name: string) => ({
        slug,
        name,
        short_name: "Conc Prod",
        category: "Sunglasses",
        gender: "Unisex",
        price: 9000,
        currency: "BDT",
        currency_symbol: "৳",
        description: "Concurrent allocation test",
        short_description: "Conc test",
        frame_shape: "Square",
        frame_look: "Classic Acetate",
        frame_color: "Black",
        lens_color: "Charcoal",
        lens_type: "Polarized-Style Tint",
        style_category: "Contemporary",
        fit: "Universal",
        features: ["Feature A"],
        in_stock: true,
        is_active: false,
        seo_title: name,
        seo_description: name,
      });

      // Concurrently insert two products omitting sort_order
      const [p1Res, p2Res] = await Promise.all([
        callPostgrest("products", "POST", admin.token, prodPayload(slugP1, "Conc Prod 1")),
        callPostgrest("products", "POST", owner.token, prodPayload(slugP2, "Conc Prod 2")),
      ]);

      assert(p1Res.status === 201 && p2Res.status === 201, "Concurrent product insert: both inserts succeeded (201)");
      const p1Sort = p1Res.data?.[0]?.sort_order;
      const p2Sort = p2Res.data?.[0]?.sort_order;
      assert(
        typeof p1Sort === "number" && typeof p2Sort === "number" && p1Sort !== p2Sort,
        `Concurrent product insert: sort_order allocated uniquely without collision (${p1Sort} vs ${p2Sort})`
      );
      assert(
        (p1Sort === 42 && p2Sort === 43) || (p1Sort === 43 && p2Sort === 42),
        "Concurrent product insert: assigned positions remain contiguous (42 and 43)"
      );

      // Clean up in reverse (LIFO) order
      const higherId = p1Sort > p2Sort ? p1Res.data[0].id : p2Res.data[0].id;
      const lowerId = p1Sort > p2Sort ? p2Res.data[0].id : p1Res.data[0].id;
      await (adminClient.from("products") as any).delete().eq("id", higherId);
      await (adminClient.from("products") as any).delete().eq("id", lowerId);

      // Concurrently insert two collections omitting sort_order
      const slugC1 = `phase10-conc-col-1-${Date.now()}`;
      const slugC2 = `phase10-conc-col-2-${Date.now()}`;
      const colPayload = (slug: string, name: string) => ({
        slug,
        name,
        tagline: "Conc Col Tagline",
        description: "Concurrent col description",
        is_active: false,
      });

      const [c1Res, c2Res] = await Promise.all([
        callPostgrest("collections", "POST", admin.token, colPayload(slugC1, "Conc Col 1")),
        callPostgrest("collections", "POST", owner.token, colPayload(slugC2, "Conc Col 2")),
      ]);

      assert(c1Res.status === 201 && c2Res.status === 201, "Concurrent collection insert: both inserts succeeded (201)");
      const c1Sort = c1Res.data?.[0]?.sort_order;
      const c2Sort = c2Res.data?.[0]?.sort_order;
      assert(
        typeof c1Sort === "number" && typeof c2Sort === "number" && c1Sort !== c2Sort,
        `Concurrent collection insert: sort_order allocated uniquely without collision (${c1Sort} vs ${c2Sort})`
      );
      assert(
        (c1Sort === 6 && c2Sort === 7) || (c1Sort === 7 && c2Sort === 6),
        "Concurrent collection insert: assigned positions remain contiguous (6 and 7)"
      );

      // Clean up in reverse order
      const higherColId = c1Sort > c2Sort ? c1Res.data[0].id : c2Res.data[0].id;
      const lowerColId = c1Sort > c2Sort ? c2Res.data[0].id : c1Res.data[0].id;
      await (adminClient.from("collections") as any).delete().eq("id", higherColId);
      await (adminClient.from("collections") as any).delete().eq("id", lowerColId);
    }

    // -------------------------------------------------------------------------
    // [6.4] Gapped Sort Order Attack
    // -------------------------------------------------------------------------
    console.log("\n[6.4] Testing Gapped Sort Order Attack (Contiguity Integrity)...");
    {
      // Attempt to set a product sort_order to 999 -> BLOCKED by contiguity trigger
      const gappedProd = await callPostgrest(`products?id=eq.${prodIds[prodIds.length - 1]}`, "PATCH", admin.token, {
        sort_order: 999,
      });
      assert(
        gappedProd.status >= 400 && (gappedProd.data?.code === "23514" || gappedProd.data?.message?.includes("contiguous")),
        "Gapped product sort order: mutating to non-contiguous position (999) strictly BLOCKED by contiguity trigger"
      );

      // Attempt to set a collection sort_order to 999 -> BLOCKED by contiguity trigger
      const gappedCol = await callPostgrest(`collections?id=eq.${colIds[colIds.length - 1]}`, "PATCH", admin.token, {
        sort_order: 999,
      });
      assert(
        gappedCol.status >= 400 && (gappedCol.data?.code === "23514" || gappedCol.data?.message?.includes("contiguous")),
        "Gapped collection sort order: mutating to non-contiguous position (999) strictly BLOCKED by contiguity trigger"
      );
    }

    // Clean up disposable test accounts from Supabase Auth
    await adminClient.auth.admin.deleteUser(owner.id);
    await adminClient.auth.admin.deleteUser(admin.id);
    await adminClient.auth.admin.deleteUser(outsider.id);

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
