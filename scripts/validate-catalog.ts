import { PRODUCTS, COLLECTIONS_META } from "../src/data/products";
import {
  getAllProducts,
  getProductBySlug,
  getFeaturedProducts,
  getBestSellers,
  getNewArrivals,
  getProductsByCollection,
  getRelatedProducts
} from "../src/lib/products";
import * as fs from "fs";
import * as path from "path";

console.log("==================================================");
console.log("VANTAIRE EYEWEAR v1.2 DETERMINISTIC CATALOG VALIDATOR");
console.log("==================================================");

let failureCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILURE: ${message}`);
    failureCount++;
  } else {
    console.log(`✓ ${message}`);
  }
}

// 1. Total product count >= 40
assert(PRODUCTS.length >= 40, `Total products count must be >= 40 (Found: ${PRODUCTS.length})`);

// 2. Unique product IDs & Slugs
const idSet = new Set<string>();
const slugSet = new Set<string>();
const primaryImageSet = new Set<string>();

const baselineSlugs = [
  "noir-sovereign-aviator",
  "monaco-sculpted-square",
  "vesper-pantoscopic-round",
  "verona-architectural-cat-eye",
  "atlas-polarized-wayfarer",
  "solstice-geometric-octagon",
  "velocity-aerodynamic-sport",
  "arden-crystal-clear-square",
  "riviera-rimless-titanium",
  "sienna-vintage-gradient-round",
  "obsidian-edge-oversized-square",
  "corsica-pilot-double-bridge"
];

for (const p of PRODUCTS) {
  // Check ID
  assert(!idSet.has(p.id), `Unique product ID for ${p.id}`);
  idSet.add(p.id);

  // Check Slug
  assert(!slugSet.has(p.slug), `Unique product slug for ${p.slug}`);
  slugSet.add(p.slug);

  // Required Fields
  assert(Boolean(p.name && p.name.trim().length > 0), `Product ${p.slug} has valid name`);
  assert(typeof p.price === "number" && p.price > 0, `Product ${p.slug} has valid positive price`);
  assert(Boolean(p.frameShape), `Product ${p.slug} has frameShape`);
  assert(Boolean(p.frameLook), `Product ${p.slug} has frameLook`);
  assert(Boolean(p.seoTitle && p.seoTitle.includes("VANTAIRE")), `Product ${p.slug} has branded seoTitle`);
  assert(Boolean(p.seoDescription && p.seoDescription.length > 20), `Product ${p.slug} has seoDescription`);

  // Images
  assert(Boolean(p.images && p.images.length > 0), `Product ${p.slug} has at least one image`);
  const primaryImg = p.images[0];
  assert(!primaryImageSet.has(primaryImg), `Unique primary image for ${p.slug} (${primaryImg})`);
  primaryImageSet.add(primaryImg);

  // Check image exists on disk
  const diskPath = path.join(process.cwd(), "public", primaryImg.replace(/^\//, ""));
  const fileExists = fs.existsSync(diskPath);
  assert(fileExists, `Image file exists on disk: ${primaryImg}`);
  if (fileExists) {
    const stat = fs.statSync(diskPath);
    assert(stat.size > 1000, `Image file ${primaryImg} is valid non-empty asset (${stat.size} bytes)`);
  }
}

// 3. Baseline Slugs Preserved
for (const baseSlug of baselineSlugs) {
  assert(slugSet.has(baseSlug), `Historical baseline slug preserved: ${baseSlug}`);
}

// 4. Collections Meta and Cover Images
assert(COLLECTIONS_META.length >= 6, `Collections count >= 6 (Found: ${COLLECTIONS_META.length})`);
for (const col of COLLECTIONS_META) {
  const diskPath = path.join(process.cwd(), "public", col.coverImage.replace(/^\//, ""));
  assert(fs.existsSync(diskPath), `Collection cover exists on disk: ${col.coverImage} for ${col.slug}`);
  const items = getProductsByCollection(col.slug);
  assert(items.length >= 4, `Collection ${col.slug} has sufficient items (${items.length})`);
}

// 5. Query Utilities: Featured, Best Sellers, New Arrivals
const featured = getFeaturedProducts();
const bestSellers = getBestSellers();
const newArrivals = getNewArrivals();

assert(featured.length >= 6, `Featured products count >= 6 (Found: ${featured.length})`);
assert(bestSellers.length >= 6, `Best sellers count >= 6 (Found: ${bestSellers.length})`);
assert(newArrivals.length >= 6, `New arrivals count >= 6 (Found: ${newArrivals.length})`);

// 6. Related Products Logic
for (const p of PRODUCTS) {
  const related = getRelatedProducts(p.slug, 4);
  assert(related.length === 4, `Related products count is exactly 4 for ${p.slug} (Found: ${related.length})`);
  assert(!related.some((r) => r.slug === p.slug), `Related products does not contain self for ${p.slug}`);

  const relatedSlugs = new Set(related.map((r) => r.slug));
  assert(relatedSlugs.size === related.length, `Related products contain no duplicates for ${p.slug}`);
}

// 7. Slug Resolution via getProductBySlug
for (const p of PRODUCTS) {
  const resolved = getProductBySlug(p.slug);
  assert(resolved?.id === p.id, `getProductBySlug('${p.slug}') resolves correctly`);
}

// 8. Editorial & Hero Assets
const extraAssets = [
  "/images/fallback-sunglasses.jpg",
  "/images/hero/hero-sunglasses.jpg",
  "/images/editorial/editorial-story.jpg",
  "/images/editorial/occasion-architectural.jpg",
  "/images/editorial/occasion-coastal.jpg",
  "/images/editorial/occasion-highway.jpg",
  "/images/editorial/occasion-sport.jpg"
];

for (const asset of extraAssets) {
  const diskPath = path.join(process.cwd(), "public", asset.replace(/^\//, ""));
  assert(fs.existsSync(diskPath), `Editorial/hero asset exists on disk: ${asset}`);
}

console.log("==================================================");
if (failureCount === 0) {
  console.log("🎉 ALL VALIDATION CHECKS PASSED (0 ERRORS)");
  console.log("==================================================");
  process.exit(0);
} else {
  console.error(`💥 VALIDATION FAILED WITH ${failureCount} ERRORS`);
  console.log("==================================================");
  process.exit(1);
}
