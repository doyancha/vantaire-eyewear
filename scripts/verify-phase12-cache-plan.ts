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

// 2. Product Created Event (Active vs Inactive)
console.log("\n2. TESTING product_created EVENT");
// Active product creation
const pCreatedActive = buildInvalidationPlan({
  type: "product_created",
  slug: "vantaire-x1",
  collectionSlugs: ["aviator", "square"],
  isActive: true,
});
assert(pCreatedActive.tags.includes("products"), "Active: Tags include 'products'");
assert(pCreatedActive.tags.includes("product:vantaire-x1"), "Active: Tags include product tag");
assert(pCreatedActive.tags.includes("collection:aviator"), "Active: Tags include collection:aviator");
assert(pCreatedActive.tags.includes("collection:square"), "Active: Tags include collection:square");
assert(pCreatedActive.paths.includes("/products/vantaire-x1"), "Active: Paths include /products/vantaire-x1");
assert(pCreatedActive.paths.includes("/collections/aviator"), "Active: Paths include /collections/aviator");
assert(pCreatedActive.paths.includes("/shop"), "Active: Paths include /shop");
assert(pCreatedActive.paths.includes("/sitemap.xml"), "Active: Paths include /sitemap.xml");
assert(isSorted(pCreatedActive.tags), "Tags are deterministically sorted");
assert(isSorted(pCreatedActive.paths), "Paths are deterministically sorted");
assert(isDeduplicated(pCreatedActive.tags), "Tags are deduplicated");
assert(isDeduplicated(pCreatedActive.paths), "Paths are deduplicated");

// Inactive draft product creation (0 public tags, 0 public paths)
const pCreatedInactive = buildInvalidationPlan({
  type: "product_created",
  slug: "vantaire-draft",
  collectionSlugs: ["aviator"],
  isActive: false,
});
assert(pCreatedInactive.tags.length === 0, "Inactive: Exactly 0 public cache tags");
assert(!pCreatedInactive.paths.includes("/"), "Inactive: Does not include /");
assert(!pCreatedInactive.paths.includes("/shop"), "Inactive: Does not include /shop");
assert(!pCreatedInactive.paths.includes("/collections"), "Inactive: Does not include /collections");
assert(!pCreatedInactive.paths.includes("/sitemap.xml"), "Inactive: Does not include /sitemap.xml");
assert(!pCreatedInactive.paths.includes("/products/vantaire-draft"), "Inactive: Does not include /products/vantaire-draft");
assert(pCreatedInactive.paths.includes("/admin"), "Inactive: Includes /admin");
assert(pCreatedInactive.paths.includes("/admin/products"), "Inactive: Includes /admin/products");

// 3. Product Updated Event
console.log("\n3. TESTING product_updated EVENT");
const pUpdated = buildInvalidationPlan({
  type: "product_updated",
  slug: "vantaire-x2",
  oldSlug: "vantaire-x1",
  collectionSlugs: ["aviator"],
  isActive: true,
});
assert(pUpdated.tags.includes("products"), "Tags include 'products'");
assert(pUpdated.tags.includes("product:vantaire-x2"), "Tags include product:vantaire-x2");
assert(pUpdated.tags.includes("product:vantaire-x1"), "Tags include old slug product:vantaire-x1");
assert(pUpdated.paths.includes("/products/vantaire-x2"), "Paths include /products/vantaire-x2");
assert(pUpdated.paths.includes("/products/vantaire-x1"), "Paths include /products/vantaire-x1");
assert(pUpdated.paths.includes("/admin/merchandising"), "Paths include /admin/merchandising");
assert(!pUpdated.paths.includes("/sitemap.xml"), "Precision: Product update does NOT invalidate sitemap");

// Inactive product update
const pUpdatedInactive = buildInvalidationPlan({
  type: "product_updated",
  slug: "vantaire-inactive",
  isActive: false,
});
assert(pUpdatedInactive.tags.length === 0, "Inactive update: 0 public tags");
assert(!pUpdatedInactive.paths.includes("/shop"), "Inactive update: 0 public paths");
assert(pUpdatedInactive.paths.includes("/admin/products"), "Inactive update: includes /admin/products");

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
assert(pLifecycle.paths.includes("/sitemap.xml"), "Lifecycle: MUST invalidate /sitemap.xml");

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
assert(!pMedia.paths.includes("/sitemap.xml"), "Precision: Media update does NOT invalidate sitemap");

// 6. Product Reordered & Flags Updated Events
console.log("\n6. TESTING MERCHANDISING EVENTS");
const pReorder = buildInvalidationPlan({ type: "product_reordered" });
assert(pReorder.tags.includes("products"), "Product reorder invalidates 'products'");
assert(!pReorder.tags.includes("merchandising"), "Dead 'merchandising' tag not present");
assert(pReorder.paths.includes("/shop"), "Product reorder invalidates /shop");
assert(pReorder.paths.includes("/admin/merchandising"), "Product reorder invalidates /admin/merchandising");
assert(!pReorder.paths.includes("/sitemap.xml"), "Precision: Product reorder does NOT invalidate sitemap");

const pFlags = buildInvalidationPlan({ type: "product_flags_updated", slug: "vantaire-x1" });
assert(pFlags.tags.includes("products"), "Flags update invalidates 'products'");
assert(pFlags.tags.includes("product:vantaire-x1"), "Flags update invalidates specific product tag");
assert(!pFlags.paths.includes("/sitemap.xml"), "Precision: Flags update does NOT invalidate sitemap");

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
assert(cLifecycle.paths.includes("/sitemap.xml"), "Lifecycle: Collection lifecycle MUST invalidate /sitemap.xml");

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
assert(!cMembership.paths.includes("/sitemap.xml"), "Precision: Membership change does NOT invalidate sitemap");

// 9. Collection Created & Cover Updated Events
console.log("\n9. TESTING COLLECTION CREATED & COVER UPDATED EVENTS");
const cCreatedInactive = buildInvalidationPlan({
  type: "collection_created",
  slug: "retro",
  isActive: false,
});
assert(cCreatedInactive.tags.length === 0, "Inactive collection create: Exactly 0 public tags");
assert(!cCreatedInactive.paths.includes("/"), "Inactive collection create: No public / path");
assert(!cCreatedInactive.paths.includes("/collections"), "Inactive collection create: No public /collections path");
assert(cCreatedInactive.paths.includes("/admin/collections"), "Inactive collection create: Includes admin path");

const cCover = buildInvalidationPlan({
  type: "collection_cover_updated",
  slug: "aviator",
});
assert(cCover.tags.includes("collections"), "Cover: invalidates 'collections'");
assert(cCover.tags.includes("collection:aviator"), "Cover: invalidates 'collection:aviator'");
assert(!cCover.tags.includes("products"), "Precision: Cover update does NOT invalidate 'products' tag");
assert(!cCover.paths.includes("/sitemap.xml"), "Precision: Cover update does NOT invalidate sitemap");
assert(!cCover.paths.includes("/shop"), "Precision: Cover update does NOT invalidate /shop");

const cReorder = buildInvalidationPlan({ type: "collection_reordered" });
assert(cReorder.tags.includes("collections"), "Collection reorder invalidates 'collections'");
assert(!cReorder.paths.includes("/sitemap.xml"), "Precision: Collection reorder does NOT invalidate sitemap");

// 10. Site Settings Updated Event
console.log("\n10. TESTING site_settings_updated EVENT");
const sUpdated = buildInvalidationPlan({ type: "site_settings_updated" });
assert(sUpdated.tags.includes("site-settings"), "Tags include 'site-settings'");
assert(sUpdated.paths.includes("/contact"), "Paths include /contact");
assert(sUpdated.paths.includes("/shipping"), "Paths include /shipping");
assert(sUpdated.paths.includes("/faq"), "Paths include /faq");
assert(sUpdated.paths.includes("/returns"), "Paths include /returns");
assert(!sUpdated.paths.includes("/sitemap.xml"), "Precision: Site settings update does NOT invalidate sitemap");

// 11. Execution & Failure Contract Testing
console.log("\n11. TESTING applyInvalidationPlan FAILURE CONTRACT & EXECUTION");

// 11a. Test successful execution via dependency injection
const mockSuccessResult = applyInvalidationPlan(cCover, {
  tagRevalidator: () => {},
  pathRevalidator: () => {},
});
assert(mockSuccessResult.success === true, "Mock revalidator success produces success === true");
assert(mockSuccessResult.warning === undefined, "Mock revalidator success produces no warning");
assert(mockSuccessResult.revalidatedTags.length === cCover.tags.length, "All tags recorded as revalidated");
assert(mockSuccessResult.revalidatedPaths.length === cCover.paths.length, "All paths recorded as revalidated");

// 11b. Test failure contract: simulated revalidation failure must truthfully surface in InvalidationResult
const mockFailureResult = applyInvalidationPlan(cCover, {
  tagRevalidator: (tag) => {
    if (tag === "collections") throw new Error("Simulated tag failure: collections");
  },
  pathRevalidator: () => {},
});
assert(mockFailureResult.success === false, "Failed tag revalidation produces success === false");
assert(mockFailureResult.warning !== undefined, "Failure produces truthful warning message");
assert(
  mockFailureResult.warning?.includes("Simulated tag failure: collections") === true,
  "Warning contains specific error message"
);

// 11c. Test headless / isolated execution fallback
const headlessResult = applyInvalidationPlan(cCover);
// In headless tsx, Next.js revalidateTag throws Invariant static generation store missing.
// applyInvalidationPlan must catch this without throwing an unhandled exception.
assert(typeof headlessResult.success === "boolean", "Headless execution handled without throwing");
assert(headlessResult.warning !== undefined, "Headless execution produces expected context notice warning");

console.log("\n=======================================================");
console.log("  ALL PHASE 12 CACHE PLAN UNIT TESTS PASSED");
console.log("=======================================================\n");
