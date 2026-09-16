/**
 * Phase 12 Verification Script: Cache Invalidation Plan Unit Tests
 * -----------------------------------------------------------------------------
 * Tests the pure invalidation planner (buildInvalidationPlan) across all
 * mutation events, cross-module dependencies, tag deduplication, sorting,
 * and dead-tag absence.
 */

import {
  buildInvalidationPlan,
  applyInvalidationPlan,
  type MutationEvent,
} from "../src/lib/cache/invalidation";
import { CACHE_TAGS } from "../src/lib/data/cache";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

function isSorted(arr: string[]): boolean {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i].localeCompare(arr[i + 1]) > 0) return false;
  }
  return true;
}

function isDeduplicated(arr: string[]): boolean {
  return new Set(arr).size === arr.length;
}

console.log("\n=======================================================");
console.log("  PHASE 12: CACHE INVALIDATION PLAN VERIFICATION");
console.log("=======================================================\n");

// 1. Audit dead cache tags
console.log("1. AUDITING CACHE TAG CONFIGURATION");
assert(!("merchandising" in CACHE_TAGS), "Dead 'merchandising' tag eliminated from CACHE_TAGS");
assert(CACHE_TAGS.products === "products", "CACHE_TAGS.products equals 'products'");
assert(CACHE_TAGS.collections === "collections", "CACHE_TAGS.collections equals 'collections'");
assert(CACHE_TAGS.siteSettings === "site-settings", "CACHE_TAGS.siteSettings equals 'site-settings'");
assert(CACHE_TAGS.product("apex") === "product:apex", "CACHE_TAGS.product('apex') generates product:apex");
assert(CACHE_TAGS.collection("aviator") === "collection:aviator", "CACHE_TAGS.collection('aviator') generates collection:aviator");

// 2. Product Created Event
console.log("\n2. TESTING product_created EVENT");
const pCreated = buildInvalidationPlan({
  type: "product_created",
  slug: "vantaire-x1",
  collectionSlugs: ["aviator", "square"],
});
assert(pCreated.tags.includes("products"), "Tags include 'products'");
assert(pCreated.tags.includes("product:vantaire-x1"), "Tags include product tag");
assert(pCreated.tags.includes("collection:aviator"), "Tags include collection:aviator");
assert(pCreated.tags.includes("collection:square"), "Tags include collection:square");
assert(pCreated.paths.includes("/products/vantaire-x1"), "Paths include /products/vantaire-x1");
assert(pCreated.paths.includes("/collections/aviator"), "Paths include /collections/aviator");
assert(pCreated.paths.includes("/shop"), "Paths include /shop");
assert(pCreated.paths.includes("/sitemap.xml"), "Paths include /sitemap.xml");
assert(isSorted(pCreated.tags), "Tags are deterministically sorted");
assert(isSorted(pCreated.paths), "Paths are deterministically sorted");
assert(isDeduplicated(pCreated.tags), "Tags are deduplicated");
assert(isDeduplicated(pCreated.paths), "Paths are deduplicated");

// 3. Product Updated Event
console.log("\n3. TESTING product_updated EVENT");
const pUpdated = buildInvalidationPlan({
  type: "product_updated",
  slug: "vantaire-x2",
  oldSlug: "vantaire-x1",
  collectionSlugs: ["aviator"],
});
assert(pUpdated.tags.includes("products"), "Tags include 'products'");
assert(pUpdated.tags.includes("product:vantaire-x2"), "Tags include product:vantaire-x2");
assert(pUpdated.tags.includes("product:vantaire-x1"), "Tags include old slug product:vantaire-x1");
assert(pUpdated.paths.includes("/products/vantaire-x2"), "Paths include /products/vantaire-x2");
assert(pUpdated.paths.includes("/products/vantaire-x1"), "Paths include /products/vantaire-x1");
assert(pUpdated.paths.includes("/admin/merchandising"), "Paths include /admin/merchandising");

// 4. Product Lifecycle Event (archive/restore)
console.log("\n4. TESTING product_lifecycle EVENT");
const pLifecycle = buildInvalidationPlan({
  type: "product_lifecycle",
  slug: "vantaire-x1",
  collectionSlugs: ["aviator"],
});
assert(pLifecycle.tags.includes("products"), "Tags include 'products'");
assert(pLifecycle.tags.includes("product:vantaire-x1"), "Tags include product tag");
assert(pLifecycle.paths.includes("/products/vantaire-x1"), "Paths include product detail");

// 5. Product Media Updated Event
console.log("\n5. TESTING product_media_updated EVENT");
const pMedia = buildInvalidationPlan({
  type: "product_media_updated",
  productId: "prod-123",
  slug: "vantaire-x1",
});
assert(pMedia.tags.includes("products"), "Tags include 'products'");
assert(pMedia.tags.includes("product:vantaire-x1"), "Tags include product tag");
assert(pMedia.paths.includes("/admin/products/prod-123/media"), "Paths include product media admin path");
assert(pMedia.paths.includes("/admin/media"), "Paths include /admin/media");

// 6. Product Reordered & Flags Updated Events
console.log("\n6. TESTING MERCHANDISING EVENTS");
const pReorder = buildInvalidationPlan({ type: "product_reordered" });
assert(pReorder.tags.includes("products"), "Product reorder invalidates 'products'");
assert(!pReorder.tags.includes("merchandising"), "Dead 'merchandising' tag not present");
assert(pReorder.paths.includes("/shop"), "Product reorder invalidates /shop");
assert(pReorder.paths.includes("/admin/merchandising"), "Product reorder invalidates /admin/merchandising");

const pFlags = buildInvalidationPlan({ type: "product_flags_updated", slug: "vantaire-x1" });
assert(pFlags.tags.includes("products"), "Flags update invalidates 'products'");
assert(pFlags.tags.includes("product:vantaire-x1"), "Flags update invalidates specific product tag");

// 7. Collection Lifecycle & Cross-Module Invalidation
console.log("\n7. TESTING CROSS-MODULE INVALIDATION ON COLLECTION LIFECYCLE");
const cLifecycle = buildInvalidationPlan({
  type: "collection_lifecycle",
  slug: "aviator",
});
assert(cLifecycle.tags.includes("collections"), "Tags include 'collections'");
assert(cLifecycle.tags.includes("collection:aviator"), "Tags include 'collection:aviator'");
assert(
  cLifecycle.tags.includes("products"),
  "CROSS-MODULE: Collection lifecycle MUST invalidate 'products' tag"
);

// 8. Collection Membership & Cross-Module Invalidation
console.log("\n8. TESTING CROSS-MODULE INVALIDATION ON COLLECTION MEMBERSHIP");
const cMembership = buildInvalidationPlan({
  type: "collection_membership_updated",
  slug: "aviator",
  affectedProductSlugs: ["vantaire-x1", "vantaire-x2"],
});
assert(cMembership.tags.includes("collections"), "Tags include 'collections'");
assert(cMembership.tags.includes("collection:aviator"), "Tags include 'collection:aviator'");
assert(
  cMembership.tags.includes("products"),
  "CROSS-MODULE: Collection membership change MUST invalidate 'products' tag"
);
assert(cMembership.tags.includes("product:vantaire-x1"), "Tags include affected product vantaire-x1");
assert(cMembership.tags.includes("product:vantaire-x2"), "Tags include affected product vantaire-x2");
assert(cMembership.paths.includes("/products/vantaire-x1"), "Paths include /products/vantaire-x1");

// 9. Site Settings Updated Event
console.log("\n9. TESTING site_settings_updated EVENT");
const sUpdated = buildInvalidationPlan({ type: "site_settings_updated" });
assert(sUpdated.tags.includes("site-settings"), "Tags include 'site-settings'");
assert(sUpdated.paths.includes("/contact"), "Paths include /contact");
assert(sUpdated.paths.includes("/shipping"), "Paths include /shipping");
assert(sUpdated.paths.includes("/faq"), "Paths include /faq");
assert(sUpdated.paths.includes("/returns"), "Paths include /returns");
assert(sUpdated.paths.includes("/sitemap.xml"), "Paths include /sitemap.xml");

// 10. Execution in isolated/headless context
console.log("\n10. TESTING applyInvalidationPlan EXECUTION");
const execRes = applyInvalidationPlan(cMembership);
assert(typeof execRes.success === "boolean", "applyInvalidationPlan returns structured InvalidationResult");
console.log(`  ✓ Notice handled safely: ${execRes.warning || "None (clean execution)"}`);

console.log("\n=======================================================");
console.log("  ALL PHASE 12 CACHE PLAN UNIT TESTS PASSED");
console.log("=======================================================\n");
