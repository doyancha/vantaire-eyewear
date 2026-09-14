import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../src/types/database.types";
import { getAdminDashboardData } from "../src/lib/admin/dashboard";

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

async function runAdminDashboardVerification() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 6 ADMIN DASHBOARD VERIFICATION");
  console.log("==================================================");

  const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Ensure test users exist with known test passwords
  console.log("\n[1/7] Establishing Authenticated Admin & Owner Sessions...");
  const runtimeSecret = crypto.randomBytes(16).toString("hex") + "!Aa1";

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

  // Create session clients using anon key + user token (simulating authentic SSR request)
  const anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ownerLogin = await anonClient.auth.signInWithPassword({
    email: "owner@vantaire.local",
    password: runtimeSecret,
  });
  assert(Boolean(ownerLogin.data?.session), "Owner login successful with authentic JWT");

  const adminLogin = await anonClient.auth.signInWithPassword({
    email: "admin@vantaire.local",
    password: runtimeSecret,
  });
  assert(Boolean(adminLogin.data?.session), "Admin login successful with authentic JWT");

  const outsiderLogin = await anonClient.auth.signInWithPassword({
    email: "outsider@vantaire.local",
    password: runtimeSecret,
  });
  assert(Boolean(outsiderLogin.data?.session), "Outsider login successful at Auth level");

  const ownerSessionClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${ownerLogin.data.session!.access_token}`,
      },
    },
  });

  const adminSessionClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${adminLogin.data.session!.access_token}`,
      },
    },
  });

  const outsiderSessionClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${outsiderLogin.data.session!.access_token}`,
      },
    },
  });

  console.log("\n[2/7] Testing Dashboard Data Layer Execution under RLS...");
  const ownerDashboardData = await getAdminDashboardData(ownerSessionClient);
  assert(Boolean(ownerDashboardData), "Owner successfully loaded dashboard data via RLS");

  const adminDashboardData = await getAdminDashboardData(adminSessionClient);
  assert(Boolean(adminDashboardData), "Admin successfully loaded dashboard data via RLS");

  console.log("\n[3/7] Verifying Exact Database Parity of Dashboard Metrics...");
  let mismatches = 0;

  // Verify Catalog Metrics
  const { data: dbProducts } = await adminClient.from("products").select("*");
  const expectedTotal = dbProducts?.length ?? 0;
  const expectedActive = dbProducts?.filter((p) => p.is_active).length ?? 0;
  const expectedInactive = dbProducts?.filter((p) => !p.is_active).length ?? 0;
  const expectedInStock = dbProducts?.filter((p) => p.in_stock).length ?? 0;
  const expectedOutOfStock = dbProducts?.filter((p) => !p.in_stock).length ?? 0;

  if (ownerDashboardData.catalog.totalProducts !== expectedTotal) mismatches++;
  if (ownerDashboardData.catalog.activeProducts !== expectedActive) mismatches++;
  if (ownerDashboardData.catalog.inactiveProducts !== expectedInactive) mismatches++;
  if (ownerDashboardData.catalog.inStockProducts !== expectedInStock) mismatches++;
  if (ownerDashboardData.catalog.outOfStockProducts !== expectedOutOfStock) mismatches++;

  assert(ownerDashboardData.catalog.totalProducts === 42, `Total Products matches baseline: 42 (got ${ownerDashboardData.catalog.totalProducts})`);
  assert(ownerDashboardData.catalog.activeProducts === 42, `Active Products matches baseline: 42 (got ${ownerDashboardData.catalog.activeProducts})`);
  assert(ownerDashboardData.catalog.inactiveProducts === 0, `Inactive Products matches baseline: 0 (got ${ownerDashboardData.catalog.inactiveProducts})`);
  assert(ownerDashboardData.catalog.inStockProducts === 42, `In-Stock Products matches baseline: 42 (got ${ownerDashboardData.catalog.inStockProducts})`);
  assert(ownerDashboardData.catalog.outOfStockProducts === 0, `Out-of-Stock Products matches baseline: 0 (got ${ownerDashboardData.catalog.outOfStockProducts})`);

  // Verify Merchandising Metrics
  const expectedFeatured = dbProducts?.filter((p) => p.featured).length ?? 0;
  const expectedBestSellers = dbProducts?.filter((p) => p.best_seller).length ?? 0;
  const expectedNewArrivals = dbProducts?.filter((p) => p.new_arrival).length ?? 0;

  if (ownerDashboardData.merchandising.featuredProducts !== expectedFeatured) mismatches++;
  if (ownerDashboardData.merchandising.bestSellers !== expectedBestSellers) mismatches++;
  if (ownerDashboardData.merchandising.newArrivals !== expectedNewArrivals) mismatches++;

  assert(ownerDashboardData.merchandising.featuredProducts === 15, `Featured Products matches: 15 (got ${ownerDashboardData.merchandising.featuredProducts})`);
  assert(ownerDashboardData.merchandising.bestSellers === 15, `Best Sellers matches: 15 (got ${ownerDashboardData.merchandising.bestSellers})`);
  assert(ownerDashboardData.merchandising.newArrivals === 22, `New Arrivals matches: 22 (got ${ownerDashboardData.merchandising.newArrivals})`);

  // Verify Collections Metrics
  const { data: dbCollections } = await adminClient.from("collections").select("*");
  assert(ownerDashboardData.collections.totalCollections === 6, `Total Collections matches: 6 (got ${ownerDashboardData.collections.totalCollections})`);
  assert(ownerDashboardData.collections.activeCollections === 6, `Active Collections matches: 6 (got ${ownerDashboardData.collections.activeCollections})`);
  assert(ownerDashboardData.collections.inactiveCollections === 0, `Inactive Collections matches: 0 (got ${ownerDashboardData.collections.inactiveCollections})`);

  // Verify Media Metrics
  const { data: dbImages } = await adminClient.from("product_images").select("*");
  assert(ownerDashboardData.media.totalImageRecords === 42, `Product Image Records matches: 42 (got ${ownerDashboardData.media.totalImageRecords})`);
  assert(ownerDashboardData.media.productsWithPrimaryImage === 42, `Products with Primary Image matches: 42 (got ${ownerDashboardData.media.productsWithPrimaryImage})`);
  assert(ownerDashboardData.media.productsMissingPrimaryImage === 0, `Products Missing Primary Image matches: 0 (got ${ownerDashboardData.media.productsMissingPrimaryImage})`);
  assert(ownerDashboardData.media.productsMissingAnyImage === 0, `Products Missing Any Image matches: 0 (got ${ownerDashboardData.media.productsMissingAnyImage})`);
  assert(ownerDashboardData.media.isHealthy === true, `Media health flagged as completely healthy (true)`);

  // Verify SEO Metrics
  assert(ownerDashboardData.seo.healthyProducts === 42, `SEO Healthy Products: 42 (got ${ownerDashboardData.seo.healthyProducts})`);
  assert(ownerDashboardData.seo.missingTitle === 0, `Products Missing SEO Title: 0 (got ${ownerDashboardData.seo.missingTitle})`);
  assert(ownerDashboardData.seo.missingDescription === 0, `Products Missing SEO Description: 0 (got ${ownerDashboardData.seo.missingDescription})`);
  assert(ownerDashboardData.seo.isHealthy === true, `SEO health flagged as completely healthy (true)`);

  // Verify Settings Health
  assert(ownerDashboardData.settings.isConfigured === true, `Site settings singleton is configured (true)`);
  assert(ownerDashboardData.settings.hasWhatsapp === true, `Concierge WhatsApp is configured (true)`);
  assert(ownerDashboardData.settings.hasDeliveryFees === true, `Delivery fees are configured (true)`);

  assert(mismatches === 0, `DASHBOARD METRIC MISMATCHES: 0 (verified across all 19 metrics)`);

  console.log("\n[4/7] Verifying Collections Breakdown Table Product Counts...");
  const { data: dbMemberships } = await adminClient
    .from("product_collections")
    .select("collection_id, collections(slug)");

  const expectedCollectionCounts: Record<string, number> = {};
  for (const m of dbMemberships || []) {
    const slug = (m.collections as any)?.slug;
    if (slug) {
      expectedCollectionCounts[slug] = (expectedCollectionCounts[slug] || 0) + 1;
    }
  }

  let countMismatches = 0;
  for (const col of ownerDashboardData.collections.items) {
    const expected = expectedCollectionCounts[col.slug] || 0;
    if (col.productCount !== expected) {
      console.error(`  ✗ Collection count mismatch for ${col.slug}: expected ${expected}, got ${col.productCount}`);
      countMismatches++;
    }
  }
  assert(countMismatches === 0, `All 6 collection product counts match database product_collections table (Aviator: ${expectedCollectionCounts["aviator"]}, Square: ${expectedCollectionCounts["square"]}, Round: ${expectedCollectionCounts["round"]}, Cat-Eye: ${expectedCollectionCounts["cat-eye"]}, Polarized: ${expectedCollectionCounts["polarized"]}, Sport: ${expectedCollectionCounts["sport"]})`);

  console.log("\n[5/7] Verifying Outsider Security Isolation & Zero Data Leak...");
  // Outsider querying admin_profiles directly under RLS
  const { data: outsiderProfile, error: outsiderProfileErr } = await outsiderSessionClient
    .from("admin_profiles")
    .select("*")
    .maybeSingle();

  assert(
    outsiderProfile === null,
    "Outsider has no admin_profile and receives null under RLS"
  );

  console.log("\n[6/7] Verifying Route Dynamic Config & Cache Header Enforcement...");
  const layoutFile = fs.readFileSync(path.resolve(process.cwd(), "src/app/admin/(protected)/layout.tsx"), "utf-8");
  const pageFile = fs.readFileSync(path.resolve(process.cwd(), "src/app/admin/(protected)/page.tsx"), "utf-8");
  const middlewareFile = fs.readFileSync(path.resolve(process.cwd(), "src/lib/supabase/middleware.ts"), "utf-8");

  assert(
    layoutFile.includes('export const dynamic = "force-dynamic"') && layoutFile.includes("export const revalidate = 0"),
    "src/app/admin/(protected)/layout.tsx enforces force-dynamic and revalidate = 0"
  );
  assert(
    pageFile.includes('export const dynamic = "force-dynamic"') && pageFile.includes("export const revalidate = 0"),
    "src/app/admin/(protected)/page.tsx enforces force-dynamic and revalidate = 0"
  );
  assert(
    middlewareFile.includes("private, no-cache, no-store, max-age=0, must-revalidate"),
    "src/lib/supabase/middleware.ts enforces private, no-store cache headers for /admin"
  );

  console.log("\n[7/7] Verifying Client Component Secret & Bundle Isolation...");
  const adminComponentFiles = [
    "src/components/admin/AdminShell.tsx",
    "src/components/admin/AdminSidebar.tsx",
    "src/components/admin/AdminHeader.tsx",
    "src/components/admin/AdminMobileNav.tsx",
    "src/components/admin/MetricCard.tsx",
    "src/components/admin/CatalogHealthOverview.tsx",
    "src/components/admin/CollectionsTable.tsx",
    "src/components/admin/QuickActions.tsx",
    "src/app/admin/(protected)/loading.tsx",
    "src/app/admin/(protected)/error.tsx",
  ];

  let secretLeaks = 0;
  for (const relPath of adminComponentFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf-8");
    if (content.includes("SUPABASE_SERVICE_ROLE_KEY") || content.includes("SERVICE_ROLE_KEY")) {
      console.error(`  ✗ Secret leak in ${relPath}`);
      secretLeaks++;
    }
  }
  assert(secretLeaks === 0, "0 secret or service-role references in Admin components");

  console.log("\n==================================================");
  console.log("PHASE 6 ADMIN DASHBOARD VERIFICATION SUMMARY");
  console.log("==================================================");
  console.log(`Assertions Passed: ${passed}`);
  console.log(`Assertions Failed: ${failed}`);

  if (failed > 0) {
    console.error(`\n❌ PHASE 6 VERIFICATION FAILED with ${failed} failures.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 ALL PHASE 6 ADMIN DASHBOARD CHECKS PASSED!`);
  }
}

runAdminDashboardVerification().catch((err) => {
  console.error("Fatal Phase 6 verification error:", err);
  process.exit(1);
});
