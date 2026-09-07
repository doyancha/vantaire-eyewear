import { PRODUCTS } from "../src/data/products";

console.log("=== CHECKING STATIC PRODUCTS INTEGRITY ===");

let compareAtCount = 0;
let invalidCompareAtCount = 0;

for (const p of PRODUCTS) {
  if (p.compareAtPrice !== undefined) {
    compareAtCount++;
    if (p.compareAtPrice < p.price) {
      console.error(`Invalid compareAtPrice for ${p.slug}: compareAtPrice (${p.compareAtPrice}) < price (${p.price})`);
      invalidCompareAtCount++;
    }
  }
}

console.log(`Total products: ${PRODUCTS.length}`);
console.log(`Products with compareAtPrice: ${compareAtCount}`);
console.log(`Products with invalid compareAtPrice: ${invalidCompareAtCount}`);

if (invalidCompareAtCount === 0) {
  console.log("CONFIRMED: In 100% of cases where compareAtPrice is present, compareAtPrice >= price.");
}
