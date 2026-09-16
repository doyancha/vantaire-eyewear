import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../src/types/database.types";
import {
  updateProductMerchandisingSchema,
  reorderProductsSchema,
  reorderCollectionsSchema,
} from "../src/lib/admin/merchandising-validation";
import { computeEffectiveHomepageProducts } from "../src/lib/merchandising/curation";

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

async function runMerchandisingFunctionalVerification() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 10 MERCHANDISING VERIFICATION");
  console.log("==================================================");

  const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Clean any residual test fixtures from previous interrupted runs
  await (adminClient.from("products") as any).delete().like("slug", "phase10-%");
  await (adminClient.from("collections") as any).delete().like("slug", "phase10-%");

  // ---------------------------------------------------------------------------
  // [1/7] Testing Zod Validation & Pure Domain Curation Rules
  // ---------------------------------------------------------------------------
  console.log("\n[1/7] Testing Zod Validation & Domain Curation Logic...");
  {
    const validUuid = crypto.randomUUID();
    const validPayload = {
      productId: validUuid,
      expectedUpdatedAt: new Date().toISOString(),
      featured: true,
      bestSeller: false,
      newArrival: true,
    };
    assert(
      updateProductMerchandisingSchema.safeParse(validPayload).success,
      "Zod accepts valid merchandising flags payload"
    );

    assert(
      !updateProductMerchandisingSchema.safeParse({ ...validPayload, productId: "not-a-uuid" }).success,
      "Zod rejects invalid UUID for productId"
    );

    assert(
      !updateProductMerchandisingSchema.safeParse({ ...validPayload, expectedUpdatedAt: "" }).success,
      "Zod rejects empty expectedUpdatedAt token"
    );

    // Reorder schemas
    assert(
      reorderProductsSchema.safeParse({ desiredIds: [validUuid], expectedIds: [validUuid] }).success,
      "Zod accepts valid reorderProducts payload"
    );

    assert(
      !reorderProductsSchema.safeParse({ desiredIds: [], expectedIds: [] }).success,
      "Zod rejects empty array for reorderProducts"
    );

    // Pure domain curation helper
    const dummyFeatured = Array.from({ length: 8 }, (_, i) => ({ slug: `feat-${i}` }));
    const dummyBest = [
      { slug: "feat-0" }, // Overlap with featured
      { slug: "feat-1" }, // Overlap with featured
      ...Array.from({ length: 7 }, (_, i) => ({ slug: `best-${i}` })),
    ];

    const curated = computeEffectiveHomepageProducts(dummyFeatured, dummyBest);
    assert(
      curated.effectiveFeatured.length === 6,
      "computeEffectiveHomepageProducts caps effective featured at exactly 6"
    );
    assert(
      curated.effectiveBestSellers.length === 6,
      "computeEffectiveHomepageProducts caps effective best sellers at exactly 6"
    );
    assert(
      !curated.effectiveBestSellers.some((b) => b.slug === "feat-0" || b.slug === "feat-1"),
      "computeEffectiveHomepageProducts strictly excludes products already in effective featured"
    );
  }

  // ---------------------------------------------------------------------------
  // [2/7] Authenticating Admin Session
  // ---------------------------------------------------------------------------
  console.log("\n[2/7] Authenticating Admin Session for Mutation RPCs...");
  const runtimeSecret = crypto.randomBytes(16).toString("hex") + "!Aa1";
  const adminEmail = `phase10_admin_${Date.now()}@vantaire.test`;

  const { data: adminUser } = await adminClient.auth.admin.createUser({
    email: adminEmail,
    password: runtimeSecret,
    email_confirm: true,
  });

  if (!adminUser.user?.id) throw new Error("Failed to create admin test user");

  await (adminClient.from("admin_profiles") as any).upsert({
    id: adminUser.user.id,
    role: "admin",
    display_name: "Phase 10 Admin",
  });

  const adminClientAuth = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: loginErr } = await adminClientAuth.auth.signInWithPassword({
    email: adminEmail,
    password: runtimeSecret,
  });

  assert(!loginErr, "Authenticated Admin client established");

  // ---------------------------------------------------------------------------
  // [3/7] Testing Product Inactive Merchandising Invariant & Deactivation Trigger
  // ---------------------------------------------------------------------------
  console.log("\n[3/7] Testing Inactive Merchandising Invariant & Deactivation Auto-Clear...");
  const tempProdSlug = `phase10-prod-${Date.now()}`;
  let tempProdId: string = "";
  let tempProdUpdatedAt: string = "";

  {
    // Create inactive product
    const { data: createdProd, error: prodCreateErr } = await (adminClientAuth.from("products") as any)
      .insert({
        slug: tempProdSlug,
        name: "Phase 10 Inactive Test Frame",
        short_name: "Phase 10 Test",
        category: "Sunglasses",
        gender: "Unisex",
        price: 9500,
        compare_at_price: 12000,
        currency: "BDT",
        currency_symbol: "৳",
        description: "Test product for Phase 10 merchandising invariant verification.",
        short_description: "Short description.",
        frame_shape: "Round",
        frame_look: "Matte",
        frame_color: "Matte Obsidian Black",
        lens_color: "Deep Charcoal Tint",
        lens_type: "Polarized-Style Tint",
        style_category: "Architectural",
        fit: "Universal",
        features: ["Anti-reflective coating", "Italian acetate"],
        in_stock: true,
        is_active: false,
        featured: false,
        best_seller: false,
        new_arrival: false,
        seo_title: "Phase 10 Inactive Test Frame",
        seo_description: "Phase 10 Inactive Test SEO Description",
      })
      .select()
      .single();

    if (prodCreateErr) console.error("prodCreateErr:", prodCreateErr);
    assert(!prodCreateErr && !!createdProd, "Created inactive test product");
    if (!createdProd) throw new Error("Created product is null");
    tempProdId = createdProd.id;
    tempProdUpdatedAt = createdProd.updated_at;

    // Direct attempt to flag inactive product as featured -> DB constraint blocks it
    const { error: directFlagErr } = await (adminClientAuth.from("products") as any)
      .update({ featured: true })
      .eq("id", tempProdId);

    assert(
      !!directFlagErr && directFlagErr.code === "23514",
      "DB Constraint: chk_products_inactive_merchandising blocks setting featured = true on inactive product"
    );

    // Add a primary image so we can activate it
    const primaryImgPath = `products/${tempProdSlug}/image-1122334455667788.jpg`;
    const { error: imgErr } = await (adminClient.from("product_images") as any).insert({
      product_id: tempProdId,
      storage_path: primaryImgPath,
      alt_text: "Phase 10 Test Product Primary Image",
      is_primary: true,
      sort_order: 0,
    });
    if (imgErr) console.error("imgErr:", imgErr);

    // Activate product
    const { data: activatedProd, error: actErr } = await (adminClientAuth.from("products") as any)
      .update({ is_active: true })
      .eq("id", tempProdId)
      .select()
      .single();
    if (actErr) console.error("actErr:", actErr);

    assert(!actErr && activatedProd?.is_active === true, "Activated product with primary image");

    // Now set merchandising flags while active
    const { data: flaggedProd, error: flagErr } = await (adminClientAuth.from("products") as any)
      .update({
        featured: true,
        best_seller: true,
        new_arrival: true,
      })
      .eq("id", tempProdId)
      .select()
      .single();

    assert(
      !flagErr &&
        flaggedProd.featured === true &&
        flaggedProd.best_seller === true &&
        flaggedProd.new_arrival === true,
      "Active product successfully flagged as Featured, Best Seller, and New Arrival"
    );

    // Deactivate (archive) product -> Trigger should auto-clear all three merchandising flags
    const { data: archivedProd, error: archiveErr } = await (adminClientAuth.from("products") as any)
      .update({ is_active: false })
      .eq("id", tempProdId)
      .select()
      .single();

    assert(!archiveErr && archivedProd.is_active === false, "Product successfully soft-archived");
    assert(
      archivedProd.featured === false &&
        archivedProd.best_seller === false &&
        archivedProd.new_arrival === false,
      "DB Trigger: trg_clear_product_merchandising_on_deactivation automatically cleared flags upon deactivation"
    );

    // Restoring product to active leaves flags as false
    const { data: restoredProd, error: restoreErr } = await (adminClientAuth.from("products") as any)
      .update({ is_active: true })
      .eq("id", tempProdId)
      .select()
      .single();

    assert(!restoreErr && restoredProd.is_active === true, "Product restored to active state");
    assert(
      restoredProd.featured === false &&
        restoredProd.best_seller === false &&
        restoredProd.new_arrival === false,
      "Restored product maintains false flags (requires explicit Admin curation)"
    );
  }

  // ---------------------------------------------------------------------------
  // [4/7] Testing Product & Collection Auto-Allocation Triggers
  // ---------------------------------------------------------------------------
  console.log("\n[4/7] Testing Product & Collection Auto-Allocation Triggers...");
  const tempCollSlug = `phase10-col-${Date.now()}`;
  let tempCollId: string = "";

  {
    // Verify temp product received sort_order automatically (since sort_order was omitted / defaulted -1)
    const { data: prodData } = await adminClient
      .from("products")
      .select("sort_order")
      .eq("id", tempProdId)
      .single();

    assert(
      prodData?.sort_order !== null && prodData?.sort_order !== undefined && prodData.sort_order >= 42,
      `DB Trigger: fn_allocate_product_sort_order allocated sequential position (${prodData?.sort_order})`
    );

    // Insert collection without sort_order
    const { data: createdCol, error: colCreateErr } = await (adminClientAuth.from("collections") as any)
      .insert({
        slug: tempCollSlug,
        name: "Phase 10 Test Silhouette",
        tagline: "Test Silhouette Tagline",
        description: "Testing collection sort_order auto-allocation.",
        cover_image: null,
        is_active: false,
      })
      .select()
      .single();

    assert(!colCreateErr && !!createdCol, "Created inactive test collection omitting sort_order");
    if (createdCol) {
      tempCollId = createdCol.id;
      assert(
        createdCol.sort_order !== null && createdCol.sort_order !== undefined && createdCol.sort_order >= 6,
        `DB Trigger: fn_allocate_collection_sort_order allocated sequential position (${createdCol.sort_order})`
      );
    }
  }

  // Clean test fixtures now to return to clean catalog order for RPC testing
  await (adminClient.from("products") as any).delete().eq("id", tempProdId);
  await (adminClient.from("collections") as any).delete().eq("id", tempCollId);

  // ---------------------------------------------------------------------------
  // [5/7] Testing Atomic Reorder RPCs & Snapshot Concurrency Protection
  // ---------------------------------------------------------------------------
  console.log("\n[5/7] Testing Atomic Reorder RPCs & Snapshot Concurrency Protection...");
  {
    // Fetch canonical collections
    const { data: canonicalCols } = await adminClient
      .from("collections")
      .select("id, slug, sort_order")
      .order("sort_order", { ascending: true });

    if (!canonicalCols || canonicalCols.length !== 6) {
      throw new Error(`Expected 6 canonical collections, found ${canonicalCols?.length}`);
    }

    const colIds = canonicalCols.map((c) => c.id);
    const swappedColIds = [colIds[1], colIds[0], ...colIds.slice(2)];

    // 1. Valid collection reorder with matching expected snapshot
    const { data: reorderColRes, error: reorderColErr } = await adminClientAuth.rpc(
      "reorder_collections",
      {
        p_ordered_ids: swappedColIds,
        p_expected_order: colIds,
      }
    );

    assert(!reorderColErr && reorderColRes?.[0]?.success === true, "RPC reorder_collections executed successfully");
    assert(reorderColRes?.[0]?.total_reordered === 6, "RPC reorder_collections updated all 6 collections");

    // Verify swap in database
    const { data: verifySwapCols } = await adminClient
      .from("collections")
      .select("id, sort_order")
      .in("id", [colIds[0], colIds[1]])
      .order("sort_order", { ascending: true });

    assert(
      verifySwapCols?.[0]?.id === colIds[1] && verifySwapCols?.[0]?.sort_order === 0 &&
      verifySwapCols?.[1]?.id === colIds[0] && verifySwapCols?.[1]?.sort_order === 1,
      "Collections order successfully swapped in database"
    );

    // 2. Stale Snapshot Conflict: submitting old expected snapshot should be rejected
    const { error: staleColErr } = await adminClientAuth.rpc("reorder_collections", {
      p_ordered_ids: colIds,
      p_expected_order: colIds, // Stale! DB current order is swappedColIds
    });

    assert(
      !!staleColErr && staleColErr.message.includes("Conflict"),
      "RPC reorder_collections strictly blocks stale snapshot with Conflict error"
    );

    // 3. Restore canonical collection order
    const { error: restoreColErr } = await adminClientAuth.rpc("reorder_collections", {
      p_ordered_ids: colIds,
      p_expected_order: swappedColIds,
    });
    assert(!restoreColErr, "Canonical collection order restored successfully");

    // Fetch canonical products
    const { data: canonicalProds } = await adminClient
      .from("products")
      .select("id, slug, sort_order")
      .order("sort_order", { ascending: true });

    if (!canonicalProds || canonicalProds.length !== 42) {
      throw new Error(`Expected 42 canonical products, found ${canonicalProds?.length}`);
    }

    const prodIds = canonicalProds.map((p) => p.id);
    const swappedProdIds = [prodIds[1], prodIds[0], ...prodIds.slice(2)];

    // 4. Valid product reorder
    const { data: reorderProdRes, error: reorderProdErr } = await adminClientAuth.rpc(
      "reorder_products",
      {
        p_ordered_ids: swappedProdIds,
        p_expected_order: prodIds,
      }
    );

    assert(!reorderProdErr && reorderProdRes?.[0]?.success === true, "RPC reorder_products executed successfully");
    assert(reorderProdRes?.[0]?.total_reordered === 42, "RPC reorder_products updated all 42 products");

    // 5. Stale product reorder conflict
    const { error: staleProdErr } = await adminClientAuth.rpc("reorder_products", {
      p_ordered_ids: prodIds,
      p_expected_order: prodIds, // Stale!
    });

    assert(
      !!staleProdErr && staleProdErr.message.includes("Conflict"),
      "RPC reorder_products strictly blocks stale snapshot with Conflict error"
    );

    // 6. Restore canonical product order
    const { error: restoreProdErr } = await adminClientAuth.rpc("reorder_products", {
      p_ordered_ids: prodIds,
      p_expected_order: swappedProdIds,
    });
    assert(!restoreProdErr, "Canonical product order restored successfully");
  }

  // ---------------------------------------------------------------------------
  // [6/7] Testing Clean Catalog Baseline & Flag Invariants
  // ---------------------------------------------------------------------------
  console.log("\n[6/7] Verifying Clean Catalog Baseline & Merchandising Totals...");
  {
    const { count: prodCount } = await adminClient.from("products").select("*", { count: "exact", head: true });
    assert(prodCount === 42, `Clean baseline: exactly 42 products in database (got ${prodCount})`);

    const { count: activeProdCount } = await adminClient
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    assert(activeProdCount === 42, `Clean baseline: exactly 42 active products (got ${activeProdCount})`);

    const { count: colCount } = await adminClient.from("collections").select("*", { count: "exact", head: true });
    assert(colCount === 6, `Clean baseline: exactly 6 collections in database (got ${colCount})`);

    const { count: activeColCount } = await adminClient
      .from("collections")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    assert(activeColCount === 6, `Clean baseline: exactly 6 active collections (got ${activeColCount})`);

    const { count: featuredCount } = await adminClient
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("featured", true);
    assert(featuredCount === 15, `Clean baseline: exactly 15 featured products (got ${featuredCount})`);

    const { count: bestSellerCount } = await adminClient
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("best_seller", true);
    assert(bestSellerCount === 15, `Clean baseline: exactly 15 best sellers (got ${bestSellerCount})`);

    const { count: newArrivalCount } = await adminClient
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("new_arrival", true);
    assert(newArrivalCount === 22, `Clean baseline: exactly 22 new arrivals (got ${newArrivalCount})`);

    const { data: allProds } = await adminClient
      .from("products")
      .select("sort_order")
      .order("sort_order", { ascending: true });
    const prodOrders = allProds?.map((p) => p.sort_order) || [];
    const prodOrderValid =
      prodOrders.length === 42 &&
      prodOrders[0] === 0 &&
      prodOrders[41] === 41 &&
      new Set(prodOrders).size === 42;
    assert(prodOrderValid, "Product sort_order sequence is 100% contiguous and unique (0..41)");

    const { data: allCols } = await adminClient
      .from("collections")
      .select("sort_order")
      .order("sort_order", { ascending: true });
    const colOrders = allCols?.map((c) => c.sort_order) || [];
    const colOrderValid =
      colOrders.length === 6 &&
      colOrders[0] === 0 &&
      colOrders[5] === 5 &&
      new Set(colOrders).size === 6;
    assert(colOrderValid, "Collection sort_order sequence is 100% contiguous and unique (0..5)");
  }

  // ---------------------------------------------------------------------------
  // [7/7] Summary
  // ---------------------------------------------------------------------------
  console.log("\n==================================================");
  console.log(`Assertions Passed: ${passed}`);
  console.log(`Assertions Failed: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    throw new Error(`${failed} assertion(s) failed in Phase 10 verification.`);
  } else {
    console.log("🎉 ALL PHASE 10 MERCHANDISING VERIFICATION CHECKS PASSED!\n");
  }
}

runMerchandisingFunctionalVerification().catch((err) => {
  console.error("FATAL ERROR in Phase 10 Merchandising Verification:", err);
  process.exit(1);
});
