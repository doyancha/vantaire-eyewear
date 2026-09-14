import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

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

import { PRODUCTS, COLLECTIONS_META } from "../src/data/products";
import {
  getProducts,
  getProductBySlug,
  getCollections,
  getCollectionBySlug,
  getProductsByCollection,
  getSiteSettings,
} from "../src/lib/data/storefront";
import sitemap from "../src/app/sitemap";

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

async function runRoutesVerification() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 5 ROUTES & DATA INTEGRATION VERIFICATION");
  console.log("==================================================");

  // Force Supabase mode
  process.env.VANTAIRE_STOREFRONT_DATA_SOURCE = "supabase";
  process.env.VANTAIRE_ALLOW_STATIC_FALLBACK = "false";

  console.log("\n[1/6] Verifying All 42 Product Slugs Resolve Successfully via Data Layer...");
  let resolvedProducts = 0;
  for (const p of PRODUCTS) {
    const item = await getProductBySlug(p.slug);
    if (item && item.slug === p.slug && item.images.length > 0) {
      resolvedProducts++;
    } else {
      console.error(`  ✗ Product route failed for '${p.slug}'`);
    }
  }
  assert(resolvedProducts === 42, `All 42 product detail data routes resolved successfully (got ${resolvedProducts}/42)`);

  console.log("\n[2/6] Verifying All 6 Collection Slugs & Membership Resolve Successfully...");
  let resolvedCollections = 0;
  for (const c of COLLECTIONS_META) {
    const col = await getCollectionBySlug(c.slug);
    const colProducts = await getProductsByCollection(c.slug);
    if (col && col.slug === c.slug && colProducts.length > 0) {
      resolvedCollections++;
    } else {
      console.error(`  ✗ Collection route failed for '${c.slug}'`);
    }
  }
  assert(resolvedCollections === 6, `All 6 collection routes & member products resolved successfully (got ${resolvedCollections}/6)`);

  console.log("\n[3/6] Verifying Dynamic Sitemap Generation...");
  const sitemapEntries = await sitemap();
  assert(sitemapEntries.length === 42 + 6 + 10, `Sitemap contains exactly 58 URLs (got ${sitemapEntries.length})`);
  
  const adminUrls = sitemapEntries.filter((e) => e.url.includes("/admin"));
  assert(adminUrls.length === 0, `0 admin URLs present in public sitemap`);

  const allProductUrlsPresent = PRODUCTS.every((p) =>
    sitemapEntries.some((e) => e.url.endsWith(`/products/${p.slug}`))
  );
  assert(allProductUrlsPresent, `All 42 product URLs are present in sitemap`);

  const allCollectionUrlsPresent = COLLECTIONS_META.every((c) =>
    sitemapEntries.some((e) => e.url.endsWith(`/collections/${c.slug}`))
  );
  assert(allCollectionUrlsPresent, `All 6 collection URLs are present in sitemap`);

  console.log("\n[4/6] Verifying Inactive Entity 404 / Null Isolation...");
  const nonExistentProduct = await getProductBySlug("non-existent-sunglasses-model-999");
  assert(nonExistentProduct === null, `Non-existent product returns null (triggers notFound())`);

  const nonExistentCollection = await getCollectionBySlug("non-existent-collection-999");
  assert(nonExistentCollection === null, `Non-existent collection returns null (triggers notFound())`);

  console.log("\n[5/6] Verifying Live DB Mutation & Storefront Reflection...");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:55321";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Read original settings
  const { data: originalSettings, error: readErr } = await adminClient
    .from("site_settings")
    .select("delivery_fee_inside_dhaka")
    .eq("id", 1)
    .single();

  if (readErr) {
    throw new Error(`Failed to read site_settings: ${readErr.message}`);
  }

  const originalFee = Number(originalSettings.delivery_fee_inside_dhaka);
  const testFee = originalFee + 25;

  // Mutate
  const { error: updateErr } = await adminClient
    .from("site_settings")
    .update({ delivery_fee_inside_dhaka: testFee })
    .eq("id", 1);

  if (updateErr) {
    throw new Error(`Failed to update site_settings: ${updateErr.message}`);
  }

  // Read back through storefront data layer
  const mutatedSettings = await getSiteSettings();
  assert(
    mutatedSettings.delivery.feeInsideDhaka === testFee,
    `Live DB mutation immediately reflected in storefront data layer (fee changed from ৳${originalFee} to ৳${testFee})`
  );

  // Restore
  const { error: restoreErr } = await adminClient
    .from("site_settings")
    .update({ delivery_fee_inside_dhaka: originalFee })
    .eq("id", 1);

  if (restoreErr) {
    throw new Error(`Failed to restore site_settings: ${restoreErr.message}`);
  }

  const restoredSettings = await getSiteSettings();
  assert(
    restoredSettings.delivery.feeInsideDhaka === originalFee,
    `Original DB value successfully restored (fee restored to ৳${originalFee})`
  );

  console.log("\n[6/6] Verifying Client Bundle Security Isolation...");
  const clientFiles = [
    "src/app/shop/ShopCatalogClient.tsx",
    "src/components/product/ProductCard.tsx",
    "src/components/product/ProductInfo.tsx",
    "src/components/product/ProductGallery.tsx",
    "src/components/product/StickyWhatsAppOrder.tsx",
    "src/components/layout/Header.tsx",
    "src/components/layout/Footer.tsx",
    "src/components/layout/AnnouncementBar.tsx",
  ];

  let clientSecurityLeaks = 0;
  for (const relFile of clientFiles) {
    const fullPath = path.resolve(process.cwd(), relFile);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf-8");
    if (content.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      console.error(`  ✗ Security leak in ${relFile}: contains SUPABASE_SERVICE_ROLE_KEY`);
      clientSecurityLeaks++;
    }
    if (content.includes("@supabase/supabase-js")) {
      console.error(`  ✗ Client component bundle leak in ${relFile}: imports @supabase/supabase-js directly`);
      clientSecurityLeaks++;
    }
  }
  assert(clientSecurityLeaks === 0, `0 client components import Supabase client or reference service role key`);

  console.log("\n==================================================");
  console.log("PHASE 5 ROUTES & DATA INTEGRATION SUMMARY");
  console.log("==================================================");
  console.log(`Assertions Passed: ${passed}`);
  console.log(`Assertions Failed: ${failed}`);

  if (failed > 0) {
    console.error(`\n❌ PHASE 5 ROUTES VERIFICATION FAILED with ${failed} failures.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 ALL PHASE 5 ROUTES & DATA INTEGRATION CHECKS PASSED!`);
  }
}

runRoutesVerification().catch((err) => {
  console.error("Fatal routes verification error:", err);
  process.exit(1);
});
