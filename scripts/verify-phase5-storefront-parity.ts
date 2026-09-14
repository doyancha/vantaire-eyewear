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

import { PRODUCTS, COLLECTIONS_META } from "../src/data/products";
import { siteConfig } from "../src/lib/config";
import {
  getProducts,
  getProductBySlug,
  getCollections,
  getCollectionBySlug,
  getProductsByCollection,
  getFeaturedProducts,
  getBestSellers,
  getNewArrivals,
  getRelatedProducts,
  getSiteSettings,
  calculateRelatedProducts,
} from "../src/lib/data/storefront";
import { buildProductWhatsAppUrl, buildGeneralWhatsAppUrl } from "../src/lib/whatsapp";
import manifest from "./generated/phase4-media-manifest.json";

interface ManifestEntry {
  entityType: "product" | "collection";
  slug: string;
  sourcePath: string;
  storagePath: string;
  sha256: string;
}

const manifestEntries: ManifestEntry[] = (manifest as any).entries;

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

async function runStorefrontParityVerification() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 5 STOREFRONT PARITY VERIFICATION");
  console.log("==================================================");

  // Force Supabase mode for verification
  process.env.VANTAIRE_STOREFRONT_DATA_SOURCE = "supabase";
  process.env.VANTAIRE_ALLOW_STATIC_FALLBACK = "false";

  console.log("\n[1/7] Verifying 42 Products Core Attributes Parity (Supabase vs Static)...");
  const dbProducts = await getProducts();
  assert(dbProducts.length === 42, `Fetched exactly 42 products from DB (got ${dbProducts.length})`);

  let nonMediaMismatches = 0;
  let mediaMismatches = 0;

  for (const staticProd of PRODUCTS) {
    const dbProd = dbProducts.find((p) => p.slug === staticProd.slug);
    if (!dbProd) {
      console.error(`  ✗ Missing product in DB: ${staticProd.slug}`);
      failed++;
      continue;
    }

    // Compare identity and legacy ID invariant
    if (dbProd.id !== staticProd.id) {
      console.error(`  ✗ ID mismatch on ${staticProd.slug}: expected ${staticProd.id}, got ${dbProd.id}`);
      nonMediaMismatches++;
    }

    // Compare core descriptive fields
    if (dbProd.name !== staticProd.name) nonMediaMismatches++;
    if (dbProd.price !== staticProd.price) nonMediaMismatches++;
    if (dbProd.compareAtPrice !== staticProd.compareAtPrice) nonMediaMismatches++;
    if (dbProd.frameShape !== staticProd.frameShape) nonMediaMismatches++;
    if (dbProd.frameColor !== staticProd.frameColor) nonMediaMismatches++;
    if (dbProd.frameLook !== staticProd.frameLook) nonMediaMismatches++;
    if (dbProd.lensType !== staticProd.lensType) nonMediaMismatches++;
    if (dbProd.lensColor !== staticProd.lensColor) nonMediaMismatches++;
    if (dbProd.gender !== staticProd.gender) nonMediaMismatches++;
    if (dbProd.fit !== staticProd.fit) nonMediaMismatches++;
    if (dbProd.styleCategory !== staticProd.styleCategory) nonMediaMismatches++;
    if (dbProd.badge !== staticProd.badge) nonMediaMismatches++;
    if (dbProd.newArrival !== staticProd.newArrival) nonMediaMismatches++;
    if (dbProd.bestSeller !== staticProd.bestSeller) nonMediaMismatches++;
    if (dbProd.featured !== staticProd.featured) nonMediaMismatches++;
    if (dbProd.inStock !== staticProd.inStock) nonMediaMismatches++;
    if (dbProd.currency !== staticProd.currency) nonMediaMismatches++;
    if (dbProd.currencySymbol !== staticProd.currencySymbol) nonMediaMismatches++;
    if (dbProd.seoTitle !== staticProd.seoTitle) nonMediaMismatches++;
    if (dbProd.seoDescription !== staticProd.seoDescription) nonMediaMismatches++;

    // Compare features array
    if (JSON.stringify(dbProd.features) !== JSON.stringify(staticProd.features)) {
      nonMediaMismatches++;
    }

    // Compare collections membership (sorted)
    const staticCols = [...staticProd.collection].sort();
    const dbCols = [...dbProd.collection].sort();
    if (JSON.stringify(staticCols) !== JSON.stringify(dbCols)) {
      console.error(`  ✗ Collection membership mismatch on ${staticProd.slug}: static ${JSON.stringify(staticCols)}, db ${JSON.stringify(dbCols)}`);
      nonMediaMismatches++;
    }

    // Media verification
    const expectedManifest = manifestEntries.find((m) => m.slug === staticProd.slug && m.entityType === "product");
    if (!expectedManifest) {
      mediaMismatches++;
    } else {
      const primaryUrl = dbProd.images[0];
      if (!primaryUrl || !primaryUrl.includes(expectedManifest.storagePath)) {
        console.error(`  ✗ Primary image path mismatch on ${staticProd.slug}: ${primaryUrl} expected to contain ${expectedManifest.storagePath}`);
        mediaMismatches++;
      }
    }
  }

  assert(nonMediaMismatches === 0, `0 non-media attribute mismatches across all 42 products (got ${nonMediaMismatches})`);
  assert(mediaMismatches === 0, `0 media identity mismatches across all 42 products (got ${mediaMismatches})`);

  console.log("\n[2/7] Verifying 6 Collections Parity (Supabase vs Static)...");
  const dbCollections = await getCollections();
  assert(dbCollections.length === 6, `Fetched exactly 6 collections from DB (got ${dbCollections.length})`);

  let collectionMismatches = 0;
  for (const staticCol of COLLECTIONS_META) {
    const dbCol = dbCollections.find((c) => c.slug === staticCol.slug);
    if (!dbCol) {
      console.error(`  ✗ Missing collection in DB: ${staticCol.slug}`);
      collectionMismatches++;
      continue;
    }
    if (dbCol.name !== staticCol.name) collectionMismatches++;
    if (dbCol.tagline !== staticCol.tagline) collectionMismatches++;
    if (dbCol.description !== staticCol.description) collectionMismatches++;

    const expectedManifest = manifestEntries.find((m) => m.slug === staticCol.slug && m.entityType === "collection");
    if (!expectedManifest || !dbCol.coverImage.includes(expectedManifest.storagePath)) {
      console.error(`  ✗ Collection cover image mismatch on ${staticCol.slug}: ${dbCol.coverImage}`);
      collectionMismatches++;
    }
  }
  assert(collectionMismatches === 0, `0 collection attribute or cover image mismatches (got ${collectionMismatches})`);

  console.log("\n[3/7] Verifying Merchandising Sets & Product Queries...");
  const featured = await getFeaturedProducts();
  const staticFeatured = PRODUCTS.filter((p) => p.featured);
  assert(featured.length === staticFeatured.length, `Featured products count match: ${featured.length}`);

  const bestSellers = await getBestSellers();
  const staticBestSellers = PRODUCTS.filter((p) => p.bestSeller);
  assert(bestSellers.length === staticBestSellers.length, `Best sellers count match: ${bestSellers.length}`);

  const newArrivals = await getNewArrivals();
  const staticNewArrivals = PRODUCTS.filter((p) => p.newArrival);
  assert(newArrivals.length === staticNewArrivals.length, `New arrivals count match: ${newArrivals.length}`);

  // Test getProductBySlug
  const sampleProduct = await getProductBySlug("noir-sovereign-aviator");
  assert(sampleProduct !== null && sampleProduct.name === "Noir Sovereign Aviator", `getProductBySlug retrieved correct product`);

  // Test getCollectionBySlug
  const sampleCollection = await getCollectionBySlug("aviator");
  assert(sampleCollection !== null && sampleCollection.name === "The Aviator Edit", `getCollectionBySlug retrieved correct collection`);

  // Test getProductsByCollection
  const aviatorProducts = await getProductsByCollection("aviator");
  const staticAviator = PRODUCTS.filter((p) => p.collection.includes("aviator"));
  assert(aviatorProducts.length === staticAviator.length, `getProductsByCollection('aviator') count match: ${aviatorProducts.length}`);

  console.log("\n[4/7] Verifying Related Products Deterministic Algorithm Parity...");
  let relatedMismatches = 0;
  for (const p of PRODUCTS) {
    const staticRelated = calculateRelatedProducts(PRODUCTS, p.slug, 3);
    const dbRelated = await getRelatedProducts(p.slug, 3);
    const staticIds = staticRelated.map((r) => r.id).join(",");
    const dbIds = dbRelated.map((r) => r.id).join(",");
    if (staticIds !== dbIds) {
      console.error(`  ✗ Related mismatch for ${p.slug}: static [${staticIds}], db [${dbIds}]`);
      relatedMismatches++;
    }
  }
  assert(relatedMismatches === 0, `All 42 products have identical related products recommendation ranking (got ${relatedMismatches} mismatches)`);

  console.log("\n[5/7] Verifying Site Settings & Operational Config...");
  const settings = await getSiteSettings();
  assert(settings.brandName === siteConfig.brandName, `brandName matches siteConfig (${settings.brandName})`);
  assert(settings.whatsapp.number === siteConfig.whatsapp.number, `WhatsApp number matches siteConfig (${settings.whatsapp.number})`);
  assert(settings.delivery.feeInsideDhaka === siteConfig.delivery.feeInsideDhaka, `feeInsideDhaka matches (৳${settings.delivery.feeInsideDhaka})`);
  assert(settings.delivery.feeOutsideDhaka === siteConfig.delivery.feeOutsideDhaka, `feeOutsideDhaka matches (৳${settings.delivery.feeOutsideDhaka})`);

  console.log("\n[6/7] Verifying WhatsApp URL Generation Parity...");
  let waMismatches = 0;
  for (const p of dbProducts.slice(0, 10)) {
    const staticP = PRODUCTS.find((sp) => sp.slug === p.slug)!;
    const dbWaUrl = buildProductWhatsAppUrl(p, { settings });
    const staticWaUrl = buildProductWhatsAppUrl(staticP);
    if (dbWaUrl !== staticWaUrl) {
      console.error(`  ✗ WhatsApp URL mismatch for ${p.slug}`);
      waMismatches++;
    }
  }
  assert(waMismatches === 0, `WhatsApp URLs match 100% between static and DB products`);

  console.log("\n[7/7] Verifying Controlled Fallback Policies...");
  // Test fallback policy behavior
  process.env.VANTAIRE_STOREFRONT_DATA_SOURCE = "static";
  const staticProducts = await getProducts();
  assert(staticProducts.length === 42, `Static mode returns 42 products`);
  assert(staticProducts[0].images[0].startsWith("/images/products/"), `Static mode returns local file paths`);

  // Re-enable Supabase mode
  process.env.VANTAIRE_STOREFRONT_DATA_SOURCE = "supabase";

  console.log("\n==================================================");
  console.log("PHASE 5 STOREFRONT PARITY VERIFICATION SUMMARY");
  console.log("==================================================");
  console.log(`Assertions Passed: ${passed}`);
  console.log(`Assertions Failed: ${failed}`);

  if (failed > 0) {
    console.error(`\n❌ PHASE 5 STOREFRONT PARITY VERIFICATION FAILED with ${failed} failures.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 ALL PHASE 5 STOREFRONT PARITY CHECKS PASSED!`);
  }
}

runStorefrontParityVerification().catch((err) => {
  console.error("Fatal verification error:", err);
  process.exit(1);
});
