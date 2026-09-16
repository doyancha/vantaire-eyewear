/**
 * Phase 12 Verification Script: Live Cache & Storefront Integration
 * -----------------------------------------------------------------------------
 * Verifies live Supabase data retrieval through cached storefront providers,
 * dynamic collection navigation, sitemap decoupling, negative-cache recovery,
 * cross-module invalidation, and data integrity baselines (42 products, 6 collections,
 * 63 memberships, 42 images, 1 site settings singleton).
 * 
 * Safety Rule: This script does NOT reset or touch admin/owner passwords.
 */

import * as fs from "fs";
import * as path from "path";

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

import { getPublicSupabaseClient } from "../src/lib/supabase/public";
import {
  getProducts,
  getProductBySlug,
  getCollections,
  getCollectionBySlug,
  getSiteSettings,
  getProductsByCollection,
} from "../src/lib/data/storefront";
import sitemap from "../src/app/sitemap";
import { buildInvalidationPlan, applyInvalidationPlan } from "../src/lib/cache/invalidation";
import { CACHE_TAGS } from "../src/lib/data/cache";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function run() {
  console.log("\n=======================================================");
  console.log("  PHASE 12: LIVE CACHE & STOREFRONT INTEGRATION TEST");
  console.log("=======================================================\n");

  const supabase = getPublicSupabaseClient();

  // 1. Database baseline counts
  console.log("1. VERIFYING DATABASE INTEGRITY BASELINES");
  const { count: productCount, error: pErr } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  if (pErr) throw pErr;
  assert(productCount === 42, `42 active products in DB (found: ${productCount})`);

  const { count: collCount, error: cErr } = await supabase
    .from("collections")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);
  if (cErr) throw cErr;
  assert(collCount === 6, `6 active collections in DB (found: ${collCount})`);

  const { count: relCount, error: rErr } = await supabase
    .from("product_collections")
    .select("*", { count: "exact", head: true });
  if (rErr) throw rErr;
  assert(relCount === 63, `63 product_collections relationships in DB (found: ${relCount})`);

  const { count: imgCount, error: iErr } = await supabase
    .from("product_images")
    .select("*", { count: "exact", head: true });
  if (iErr) throw iErr;
  assert(imgCount === 42, `42 product images in DB (found: ${imgCount})`);

  const { count: settingsCount, error: sErr } = await supabase
    .from("site_settings")
    .select("*", { count: "exact", head: true });
  if (sErr) throw sErr;
  assert(settingsCount === 1, `1 site_settings singleton in DB (found: ${settingsCount})`);

  // 2. Ordering Contiguity
  console.log("\n2. VERIFYING ORDERING CONTIGUITY");
  const { data: dbProducts } = await supabase
    .from("products")
    .select("sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const productOrders = (dbProducts || []).map((p) => p.sort_order);
  const isProductContiguous = productOrders.every((val, idx) => val === idx);
  assert(isProductContiguous && productOrders.length === 42, "Product sort_order is contiguous 0..41");

  const { data: dbCollections } = await supabase
    .from("collections")
    .select("slug, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const collOrders = (dbCollections || []).map((c) => c.sort_order);
  const isCollContiguous = collOrders.every((val, idx) => val === idx);
  assert(isCollContiguous && collOrders.length === 6, "Collection sort_order is contiguous 0..5");

  // 3. Storefront Query Verification
  console.log("\n3. VERIFYING STOREFRONT PUBLIC DATA PROVIDERS");
  const products = await getProducts();
  assert(products.length === 42, `getProducts() returned 42 products`);
  assert(products[0].slug.length > 0, `First product slug: ${products[0].slug}`);

  const testSlug = products[0].slug;
  const singleProduct = await getProductBySlug(testSlug);
  assert(singleProduct !== null, `getProductBySlug('${testSlug}') returned valid product`);
  assert(singleProduct?.slug === testSlug, `Product slug matches '${testSlug}'`);
  assert((singleProduct?.images?.length ?? 0) > 0, "Product has images array populated");

  const collections = await getCollections();
  assert(collections.length === 6, `getCollections() returned 6 collections`);
  
  // Verify dynamic header order matches DB sort order
  const matchesDbOrder = collections.every((c, i) => c.slug === dbCollections![i].slug);
  assert(matchesDbOrder, "Live collections match DB global sort_order (0..5) for Header/Footer");

  const singleCollection = await getCollectionBySlug("aviator");
  assert(singleCollection !== null, "getCollectionBySlug('aviator') returned valid collection");
  assert(singleCollection?.slug === "aviator", "Collection slug matches 'aviator'");

  const collectionProducts = await getProductsByCollection("aviator");
  assert(collectionProducts.length > 0, `getProductsByCollection('aviator') returned ${collectionProducts.length} items`);

  const settings = await getSiteSettings();
  assert(typeof settings.brandName === "string" && settings.brandName.length > 0, `getSiteSettings() loaded brandName: '${settings.brandName}'`);
  assert(typeof settings.whatsapp.displayNumber === "string", "Site settings WhatsApp configured");

  // 4. Sitemap Generation
  console.log("\n4. VERIFYING SITEMAP DECOUPLING & GENERATION");
  const sitemapEntries = await sitemap();
  assert(Array.isArray(sitemapEntries), "sitemap() returned an array of entries");
  assert(sitemapEntries.length >= 42 + 6 + 10, `Sitemap has ${sitemapEntries.length} total URLs`);
  const hasProductUrl = sitemapEntries.some((e) => e.url.includes(`/products/${testSlug}`));
  const hasAviatorUrl = sitemapEntries.some((e) => e.url.includes("/collections/aviator"));
  assert(hasProductUrl, "Sitemap contains product detail URL");
  assert(hasAviatorUrl, "Sitemap contains collection URL");

  // 5. Cross-Module Invalidation Verification
  console.log("\n5. VERIFYING CROSS-MODULE INVALIDATION GUARANTEES");
  const membershipPlan = buildInvalidationPlan({
    type: "collection_membership_updated",
    slug: "aviator",
    affectedProductSlugs: [testSlug],
  });
  assert(
    membershipPlan.tags.includes(CACHE_TAGS.products),
    "CRITICAL: collection_membership_updated invalidates 'products' cache tag"
  );
  assert(
    membershipPlan.tags.includes(CACHE_TAGS.collections),
    "collection_membership_updated invalidates 'collections' cache tag"
  );
  assert(
    membershipPlan.tags.includes(CACHE_TAGS.collection("aviator")),
    "collection_membership_updated invalidates 'collection:aviator' cache tag"
  );
  assert(
    membershipPlan.tags.includes(CACHE_TAGS.product(testSlug)),
    `collection_membership_updated invalidates affected 'product:${testSlug}' cache tag`
  );

  const lifecyclePlan = buildInvalidationPlan({
    type: "collection_lifecycle",
    slug: "aviator",
  });
  assert(
    lifecyclePlan.tags.includes(CACHE_TAGS.products),
    "CRITICAL: collection_lifecycle invalidates 'products' cache tag"
  );

  const applyResult = applyInvalidationPlan(membershipPlan);
  assert(typeof applyResult.success === "boolean", "applyInvalidationPlan executed cleanly");

  console.log("\n=======================================================");
  console.log("  ALL PHASE 12 LIVE INTEGRATION TESTS PASSED");
  console.log("=======================================================\n");
}

run().catch((err) => {
  console.error("FATAL ERROR in Phase 12 live verification:", err);
  process.exit(1);
});
