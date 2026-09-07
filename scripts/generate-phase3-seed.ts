import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { PRODUCTS, COLLECTIONS_META } from "../src/data/products";
import { siteConfig } from "../src/lib/config";

// Fixed deterministic namespace for VANTAIRE catalog UUIDs
export const VANTAIRE_NAMESPACE = "e0f73b60-1e5b-4c28-98e6-9b76c8c9f001";

export function generateDeterministicUuid(namespace: string, name: string): string {
  const hex = namespace.replace(/-/g, "");
  const nsBuffer = Buffer.from(hex, "hex");
  const nameBuffer = Buffer.from(name, "utf-8");

  const hash = crypto.createHash("sha1").update(nsBuffer).update(nameBuffer).digest();

  // Set version to 5 (0101)
  hash[6] = (hash[6] & 0x0f) | 0x50;
  // Set variant to RFC 4122 (10xx)
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const b = hash.subarray(0, 16).toString("hex");
  return `${b.slice(0, 8)}-${b.slice(8, 12)}-${b.slice(12, 16)}-${b.slice(16, 20)}-${b.slice(20, 32)}`;
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

function formatSqlString(str: string | null | undefined): string {
  if (str === null || str === undefined) return "NULL";
  return `'${escapeSql(str)}'`;
}

function formatSqlNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "NULL";
  return num.toString();
}

function formatSqlBool(b: boolean | null | undefined): string {
  if (b === null || b === undefined) return "false";
  return b ? "true" : "false";
}

function formatSqlArray(arr: string[]): string {
  if (!arr || arr.length === 0) return "'{}'::text[]";
  const elements = arr.map((item) => `'${escapeSql(item)}'`).join(", ");
  return `ARRAY[${elements}]::text[]`;
}

export function generateSeedSql(): string {
  const lines: string[] = [];

  lines.push("-- ==============================================================================");
  lines.push("-- VANTAIRE EYEWEAR v1.3 — CANONICAL BASELINE SEED DATA (PHASE 3)");
  lines.push("-- ==============================================================================");
  lines.push("-- Generated automatically by scripts/generate-phase3-seed.ts");
  lines.push("-- Preserves 42 products, 6 collections, 63 relationships, and 1 site_settings row");
  lines.push("-- Idempotent, deterministic, transactional, rollback-safe.");
  lines.push("-- ==============================================================================");
  lines.push("");
  lines.push("BEGIN;");
  lines.push("");

  // ---------------------------------------------------------------------------
  // 1. COLLECTIONS (6 rows)
  // ---------------------------------------------------------------------------
  lines.push("-- 1. COLLECTIONS (6 Silhouettes)");
  lines.push("INSERT INTO public.collections (");
  lines.push("  id, slug, name, tagline, description, cover_image, is_active, sort_order");
  lines.push(") VALUES");

  const collectionIdMap = new Map<string, string>();

  const collectionValues = COLLECTIONS_META.map((col, index) => {
    const uuid = generateDeterministicUuid(VANTAIRE_NAMESPACE, `collection:${col.slug}`);
    collectionIdMap.set(col.slug, uuid);

    return `  (${formatSqlString(uuid)}, ${formatSqlString(col.slug)}, ${formatSqlString(col.name)}, ${formatSqlString(col.tagline)}, ${formatSqlString(col.description)}, ${formatSqlString(col.coverImage)}, true, ${index})`;
  });

  lines.push(collectionValues.join(",\n"));
  lines.push("ON CONFLICT (slug) DO UPDATE SET");
  lines.push("  name = EXCLUDED.name,");
  lines.push("  tagline = EXCLUDED.tagline,");
  lines.push("  description = EXCLUDED.description,");
  lines.push("  cover_image = EXCLUDED.cover_image,");
  lines.push("  is_active = EXCLUDED.is_active,");
  lines.push("  sort_order = EXCLUDED.sort_order,");
  lines.push("  updated_at = now();");
  lines.push("");

  // ---------------------------------------------------------------------------
  // 2. PRODUCTS (42 rows)
  // ---------------------------------------------------------------------------
  lines.push("-- 2. PRODUCTS (42 Catalog Items)");
  lines.push("INSERT INTO public.products (");
  lines.push("  id, legacy_id, slug, name, short_name, category, gender, price, compare_at_price,");
  lines.push("  currency, currency_symbol, description, short_description, frame_shape, frame_look,");
  lines.push("  frame_color, lens_color, lens_type, style_category, fit, features, badge, featured,");
  lines.push("  best_seller, new_arrival, in_stock, is_active, sort_order, seo_title, seo_description");
  lines.push(") VALUES");

  const productIdMap = new Map<string, string>();

  const productValues = PRODUCTS.map((p, index) => {
    const uuid = generateDeterministicUuid(VANTAIRE_NAMESPACE, `product:${p.id}`);
    productIdMap.set(p.id, uuid);

    return `  (${formatSqlString(uuid)}, ${formatSqlString(p.id)}, ${formatSqlString(p.slug)}, ${formatSqlString(p.name)}, ${formatSqlString(p.shortName)}, ${formatSqlString(p.category)}, ${formatSqlString(p.gender)}, ${formatSqlNumber(p.price)}, ${formatSqlNumber(p.compareAtPrice ?? null)}, ${formatSqlString(p.currency)}, ${formatSqlString(p.currencySymbol)}, ${formatSqlString(p.description)}, ${formatSqlString(p.shortDescription)}, ${formatSqlString(p.frameShape)}, ${formatSqlString(p.frameLook)}, ${formatSqlString(p.frameColor)}, ${formatSqlString(p.lensColor)}, ${formatSqlString(p.lensType)}, ${formatSqlString(p.styleCategory)}, ${formatSqlString(p.fit)}, ${formatSqlArray(p.features)}, ${formatSqlString(p.badge ?? null)}, ${formatSqlBool(p.featured)}, ${formatSqlBool(p.bestSeller)}, ${formatSqlBool(p.newArrival)}, ${formatSqlBool(p.inStock)}, true, ${index}, ${formatSqlString(p.seoTitle)}, ${formatSqlString(p.seoDescription)})`;
  });

  lines.push(productValues.join(",\n"));
  lines.push("ON CONFLICT (slug) DO UPDATE SET");
  lines.push("  legacy_id = EXCLUDED.legacy_id,");
  lines.push("  name = EXCLUDED.name,");
  lines.push("  short_name = EXCLUDED.short_name,");
  lines.push("  category = EXCLUDED.category,");
  lines.push("  gender = EXCLUDED.gender,");
  lines.push("  price = EXCLUDED.price,");
  lines.push("  compare_at_price = EXCLUDED.compare_at_price,");
  lines.push("  currency = EXCLUDED.currency,");
  lines.push("  currency_symbol = EXCLUDED.currency_symbol,");
  lines.push("  description = EXCLUDED.description,");
  lines.push("  short_description = EXCLUDED.short_description,");
  lines.push("  frame_shape = EXCLUDED.frame_shape,");
  lines.push("  frame_look = EXCLUDED.frame_look,");
  lines.push("  frame_color = EXCLUDED.frame_color,");
  lines.push("  lens_color = EXCLUDED.lens_color,");
  lines.push("  lens_type = EXCLUDED.lens_type,");
  lines.push("  style_category = EXCLUDED.style_category,");
  lines.push("  fit = EXCLUDED.fit,");
  lines.push("  features = EXCLUDED.features,");
  lines.push("  badge = EXCLUDED.badge,");
  lines.push("  featured = EXCLUDED.featured,");
  lines.push("  best_seller = EXCLUDED.best_seller,");
  lines.push("  new_arrival = EXCLUDED.new_arrival,");
  lines.push("  in_stock = EXCLUDED.in_stock,");
  lines.push("  is_active = EXCLUDED.is_active,");
  lines.push("  sort_order = EXCLUDED.sort_order,");
  lines.push("  seo_title = EXCLUDED.seo_title,");
  lines.push("  seo_description = EXCLUDED.seo_description,");
  lines.push("  updated_at = now();");
  lines.push("");

  // ---------------------------------------------------------------------------
  // 3. PRODUCT_COLLECTIONS (63 relationships)
  // ---------------------------------------------------------------------------
  lines.push("-- 3. PRODUCT_COLLECTIONS (63 Membership Relationships)");
  lines.push("INSERT INTO public.product_collections (");
  lines.push("  product_id, collection_id, position");
  lines.push(") VALUES");

  const relationshipValues: string[] = [];

  // Group products by collection preserving source product catalog order
  for (const col of COLLECTIONS_META) {
    const colUuid = collectionIdMap.get(col.slug)!;
    const productsInCol = PRODUCTS.filter((p) => p.collection.includes(col.slug as any));

    productsInCol.forEach((p, positionInCol) => {
      const prodUuid = productIdMap.get(p.id)!;
      relationshipValues.push(`  (${formatSqlString(prodUuid)}, ${formatSqlString(colUuid)}, ${positionInCol})`);
    });
  }

  lines.push(relationshipValues.join(",\n"));
  lines.push("ON CONFLICT (product_id, collection_id) DO UPDATE SET");
  lines.push("  position = EXCLUDED.position;");
  lines.push("");

  // ---------------------------------------------------------------------------
  // 4. SITE_SETTINGS (1 row singleton)
  // ---------------------------------------------------------------------------
  lines.push("-- 4. SITE_SETTINGS (Singleton Configuration)");
  lines.push("INSERT INTO public.site_settings (");
  lines.push("  id, whatsapp_number, whatsapp_display_number, whatsapp_is_demo, whatsapp_default_greeting,");
  lines.push("  contact_phone, contact_email, contact_hours, contact_friday_hours, contact_location,");
  lines.push("  contact_service_area, delivery_inside_dhaka_time, delivery_outside_dhaka_time,");
  lines.push("  delivery_fee_inside_dhaka, delivery_fee_outside_dhaka, delivery_currency_symbol,");
  lines.push("  delivery_currency_code, delivery_cash_on_delivery, delivery_advance_payment_note,");
  lines.push("  delivery_packaging, social_instagram, social_facebook");
  lines.push(") VALUES (");
  lines.push(`  1,`);
  lines.push(`  ${formatSqlString(siteConfig.whatsapp.number)},`);
  lines.push(`  ${formatSqlString(siteConfig.whatsapp.displayNumber)},`);
  lines.push(`  ${formatSqlBool(siteConfig.whatsapp.isDemo)},`);
  lines.push(`  ${formatSqlString(siteConfig.whatsapp.defaultGreeting)},`);
  lines.push(`  ${formatSqlString(siteConfig.contact.phone)},`);
  lines.push(`  ${formatSqlString(siteConfig.contact.email)},`);
  lines.push(`  ${formatSqlString(siteConfig.contact.hours)},`);
  lines.push(`  ${formatSqlString(siteConfig.contact.fridayHours)},`);
  lines.push(`  ${formatSqlString(siteConfig.contact.location)},`);
  lines.push(`  ${formatSqlString(siteConfig.contact.serviceArea)},`);
  lines.push(`  ${formatSqlString(siteConfig.delivery.insideDhakaTime)},`);
  lines.push(`  ${formatSqlString(siteConfig.delivery.outsideDhakaTime)},`);
  lines.push(`  ${formatSqlNumber(siteConfig.delivery.feeInsideDhaka)},`);
  lines.push(`  ${formatSqlNumber(siteConfig.delivery.feeOutsideDhaka)},`);
  lines.push(`  ${formatSqlString(siteConfig.delivery.currencySymbol)},`);
  lines.push(`  ${formatSqlString(siteConfig.delivery.currencyCode)},`);
  lines.push(`  ${formatSqlBool(siteConfig.delivery.cashOnDelivery)},`);
  lines.push(`  ${formatSqlString(siteConfig.delivery.advancePaymentNote)},`);
  lines.push(`  ${formatSqlString(siteConfig.delivery.packaging)},`);
  lines.push(`  ${formatSqlString(siteConfig.social.instagram || "")},`);
  lines.push(`  ${formatSqlString(siteConfig.social.facebook || "")}`);
  lines.push(")");
  lines.push("ON CONFLICT (id) DO UPDATE SET");
  lines.push("  whatsapp_number = EXCLUDED.whatsapp_number,");
  lines.push("  whatsapp_display_number = EXCLUDED.whatsapp_display_number,");
  lines.push("  whatsapp_is_demo = EXCLUDED.whatsapp_is_demo,");
  lines.push("  whatsapp_default_greeting = EXCLUDED.whatsapp_default_greeting,");
  lines.push("  contact_phone = EXCLUDED.contact_phone,");
  lines.push("  contact_email = EXCLUDED.contact_email,");
  lines.push("  contact_hours = EXCLUDED.contact_hours,");
  lines.push("  contact_friday_hours = EXCLUDED.contact_friday_hours,");
  lines.push("  contact_location = EXCLUDED.contact_location,");
  lines.push("  contact_service_area = EXCLUDED.contact_service_area,");
  lines.push("  delivery_inside_dhaka_time = EXCLUDED.delivery_inside_dhaka_time,");
  lines.push("  delivery_outside_dhaka_time = EXCLUDED.delivery_outside_dhaka_time,");
  lines.push("  delivery_fee_inside_dhaka = EXCLUDED.delivery_fee_inside_dhaka,");
  lines.push("  delivery_fee_outside_dhaka = EXCLUDED.delivery_fee_outside_dhaka,");
  lines.push("  delivery_currency_symbol = EXCLUDED.delivery_currency_symbol,");
  lines.push("  delivery_currency_code = EXCLUDED.delivery_currency_code,");
  lines.push("  delivery_cash_on_delivery = EXCLUDED.delivery_cash_on_delivery,");
  lines.push("  delivery_advance_payment_note = EXCLUDED.delivery_advance_payment_note,");
  lines.push("  delivery_packaging = EXCLUDED.delivery_packaging,");
  lines.push("  social_instagram = EXCLUDED.social_instagram,");
  lines.push("  social_facebook = EXCLUDED.social_facebook,");
  lines.push("  updated_at = now();");
  lines.push("");
  lines.push("COMMIT;");

  return lines.join("\n");
}

function main() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 3 DETERMINISTIC SEED GENERATOR");
  console.log("==================================================");
  const sql = generateSeedSql();
  const targetPath = path.resolve(process.cwd(), "supabase", "seed.sql");

  fs.writeFileSync(targetPath, sql, "utf-8");

  console.log(`✓ Generated seed SQL written to: ${targetPath}`);
  console.log(`  - Products: ${PRODUCTS.length}`);
  console.log(`  - Collections: ${COLLECTIONS_META.length}`);

  let totalMemberships = 0;
  for (const col of COLLECTIONS_META) {
    totalMemberships += PRODUCTS.filter((p) => p.collection.includes(col.slug as any)).length;
  }
  console.log(`  - Product-Collection Memberships: ${totalMemberships}`);
  console.log(`  - Site Settings: 1`);
  console.log("==================================================");
}

if (require.main === module) {
  main();
}
