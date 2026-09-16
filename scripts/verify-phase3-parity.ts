import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { PRODUCTS, COLLECTIONS_META } from "../src/data/products";
import { siteConfig } from "../src/lib/config";
import { Database } from "../src/types/database.types";
import { generateDeterministicUuid } from "./generate-phase3-seed";

console.log("==================================================");
console.log("VANTAIRE EYEWEAR v1.3 — PHASE 3 DATABASE PARITY VERIFICATION");
console.log("==================================================");

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
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error("❌ Required Supabase credentials missing from .env.local");
  process.exit(1);
}

const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const VANTAIRE_NAMESPACE = "e0f73b60-1e5b-4c28-98e6-9b76c8c9f001";

let failedAssertions = 0;
let passedAssertions = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passedAssertions++;
  } else {
    console.error(`  ❌ FAILED: ${description}`);
    failedAssertions++;
  }
}

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf-8").digest("hex");
}

function canonicalStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalStringify).join(",")}]`;
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`);
  return `{${pairs.join(",")}}`;
}

async function runParityVerification() {
  console.log("\n[TEST 1] Row Count Assertions");
  console.log("--------------------------------------------------");

  const { data: dbCollections, error: colErr } = await adminClient
    .from("collections")
    .select("*")
    .order("sort_order", { ascending: true });
  assert(!colErr && !!dbCollections, "Fetched collections from database");
  assert(dbCollections?.length === 6, `Collections row count is exactly 6 (found ${dbCollections?.length})`);

  const { data: dbProducts, error: prodErr } = await adminClient
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });
  assert(!prodErr && !!dbProducts, "Fetched products from database");
  assert(dbProducts?.length === 42, `Products row count is exactly 42 (found ${dbProducts?.length})`);

  const { data: dbMemberships, error: memErr } = await adminClient
    .from("product_collections")
    .select("*")
    .order("collection_id", { ascending: true })
    .order("position", { ascending: true });
  assert(!memErr && !!dbMemberships, "Fetched product_collections from database");
  assert(dbMemberships?.length === 63, `Product-collections memberships count is exactly 63 (found ${dbMemberships?.length})`);

  const { data: dbSettings, error: setErr } = await adminClient
    .from("site_settings")
    .select("*");
  assert(!setErr && !!dbSettings, "Fetched site_settings from database");
  assert(dbSettings?.length === 1, `Site settings row count is exactly 1 (found ${dbSettings?.length})`);

  const { data: dbImages, error: imgErr } = await adminClient
    .from("product_images")
    .select("*");
  assert(!imgErr && !!dbImages, "Fetched product_images from database");
  const isPhase4Baseline = (dbImages?.length ?? 0) > 0;
  if (isPhase4Baseline) {
    assert(dbImages?.length === 42, `Product images row count is exactly 42 (Phase 4 baseline, found ${dbImages?.length})`);
  } else {
    assert(dbImages?.length === 0, `Product images row count is exactly 0 (Phase 3 baseline, found ${dbImages?.length})`);
  }

  console.log("\n[TEST 2] Collections Field Parity & UUID Verification");
  console.log("--------------------------------------------------");

  const colBySlug = new Map((dbCollections || []).map((c) => [c.slug, c]));
  let colMismatchCount = 0;

  for (let i = 0; i < COLLECTIONS_META.length; i++) {
    const staticCol = COLLECTIONS_META[i];
    const dbCol = colBySlug.get(staticCol.slug);
    const expectedUuid = generateDeterministicUuid(VANTAIRE_NAMESPACE, `collection:${staticCol.slug}`);

    if (!dbCol) {
      assert(false, `Collection ${staticCol.slug} exists in database`);
      colMismatchCount++;
      continue;
    }

    const uuidMatch = dbCol.id === expectedUuid;
    const nameMatch = dbCol.name === staticCol.name;
    const taglineMatch = dbCol.tagline === staticCol.tagline;
    const descMatch = dbCol.description === staticCol.description;
    const imgMatch =
      dbCol.cover_image === staticCol.coverImage ||
      (dbCol.cover_image?.startsWith(`collections/${staticCol.slug}/cover-`) ?? false) ||
      dbCol.cover_image === `collections/collection-${staticCol.slug}.jpg`;
    const activeMatch = dbCol.is_active === true;
    const sortMatch = dbCol.sort_order === i;

    if (!uuidMatch || !nameMatch || !taglineMatch || !descMatch || !imgMatch || !activeMatch || !sortMatch) {
      colMismatchCount++;
      console.error(`  ❌ Parity mismatch on collection ${staticCol.slug}:`, {
        uuidMatch,
        nameMatch,
        taglineMatch,
        descMatch,
        imgMatch,
        activeMatch,
        sortMatch,
      });
    }
  }
  assert(colMismatchCount === 0, `All 6 collections match static data perfectly field-by-field`);

  console.log("\n[TEST 3] Products Field Parity & Deterministic UUID Verification");
  console.log("--------------------------------------------------");

  const prodBySlug = new Map((dbProducts || []).map((p) => [p.slug, p]));
  let prodMismatchCount = 0;

  for (let i = 0; i < PRODUCTS.length; i++) {
    const sp = PRODUCTS[i];
    const dbp = prodBySlug.get(sp.slug);
    const expectedUuid = generateDeterministicUuid(VANTAIRE_NAMESPACE, `product:${sp.id}`);

    if (!dbp) {
      assert(false, `Product ${sp.slug} (${sp.id}) exists in database`);
      prodMismatchCount++;
      continue;
    }

    const checks = [
      dbp.id === expectedUuid,
      dbp.legacy_id === sp.id,
      dbp.slug === sp.slug,
      dbp.name === sp.name,
      dbp.short_name === sp.shortName,
      dbp.category === sp.category,
      dbp.gender === sp.gender,
      dbp.price === sp.price,
      dbp.compare_at_price === (sp.compareAtPrice ?? null),
      dbp.currency === sp.currency,
      dbp.currency_symbol === sp.currencySymbol,
      dbp.description === sp.description,
      dbp.short_description === sp.shortDescription,
      dbp.frame_shape === sp.frameShape,
      dbp.frame_look === sp.frameLook,
      dbp.frame_color === sp.frameColor,
      dbp.lens_color === sp.lensColor,
      dbp.lens_type === sp.lensType,
      dbp.style_category === sp.styleCategory,
      dbp.fit === sp.fit,
      JSON.stringify(dbp.features) === JSON.stringify(sp.features),
      dbp.badge === (sp.badge ?? null),
      dbp.featured === sp.featured,
      dbp.best_seller === sp.bestSeller,
      dbp.new_arrival === sp.newArrival,
      dbp.in_stock === sp.inStock,
      dbp.is_active === true,
      dbp.sort_order === i,
      dbp.seo_title === sp.seoTitle,
      dbp.seo_description === sp.seoDescription,
    ];

    if (!checks.every(Boolean)) {
      prodMismatchCount++;
      console.error(`  ❌ Parity mismatch on product ${sp.slug} (${sp.id}) at index ${i}`);
    }
  }
  assert(prodMismatchCount === 0, `All 42 products match static data perfectly field-by-field`);

  console.log("\n[TEST 4] Product-Collection Membership Parity (63 relationships)");
  console.log("--------------------------------------------------");

  let membershipMismatch = 0;
  for (const col of COLLECTIONS_META) {
    const colUuid = generateDeterministicUuid(VANTAIRE_NAMESPACE, `collection:${col.slug}`);
    const expectedProds = PRODUCTS.filter((p) => p.collection.includes(col.slug as any));

    const dbRelForCol = (dbMemberships || []).filter((m) => m.collection_id === colUuid);
    if (dbRelForCol.length !== expectedProds.length) {
      membershipMismatch++;
      console.error(`  ❌ Membership count mismatch for collection ${col.slug}: expected ${expectedProds.length}, got ${dbRelForCol.length}`);
      continue;
    }

    for (let pos = 0; pos < expectedProds.length; pos++) {
      const expProd = expectedProds[pos];
      const expProdUuid = generateDeterministicUuid(VANTAIRE_NAMESPACE, `product:${expProd.id}`);
      const rel = dbRelForCol.find((r) => r.product_id === expProdUuid);

      if (!rel || rel.position !== pos) {
        membershipMismatch++;
        console.error(`  ❌ Membership mismatch for ${col.slug} position ${pos}: expected ${expProd.slug}`);
      }
    }
  }
  assert(membershipMismatch === 0, `All 63 product-collection memberships match expected order and positions`);

  console.log("\n[TEST 5] Site Settings Parity");
  console.log("--------------------------------------------------");

  const s = dbSettings?.[0];
  if (!s) {
    assert(false, "Site settings row exists");
  } else {
    const checks = [
      s.id === 1,
      s.whatsapp_number === siteConfig.whatsapp.number,
      s.whatsapp_display_number === siteConfig.whatsapp.displayNumber,
      s.whatsapp_is_demo === siteConfig.whatsapp.isDemo,
      s.whatsapp_default_greeting === siteConfig.whatsapp.defaultGreeting,
      s.contact_phone === siteConfig.contact.phone,
      s.contact_email === siteConfig.contact.email,
      s.contact_hours === siteConfig.contact.hours,
      s.contact_friday_hours === siteConfig.contact.fridayHours,
      s.contact_location === siteConfig.contact.location,
      s.contact_service_area === siteConfig.contact.serviceArea,
      s.delivery_inside_dhaka_time === siteConfig.delivery.insideDhakaTime,
      s.delivery_outside_dhaka_time === siteConfig.delivery.outsideDhakaTime,
      s.delivery_fee_inside_dhaka === siteConfig.delivery.feeInsideDhaka,
      s.delivery_fee_outside_dhaka === siteConfig.delivery.feeOutsideDhaka,
      s.delivery_currency_symbol === siteConfig.delivery.currencySymbol,
      s.delivery_currency_code === siteConfig.delivery.currencyCode,
      s.delivery_cash_on_delivery === siteConfig.delivery.cashOnDelivery,
      s.delivery_advance_payment_note === siteConfig.delivery.advancePaymentNote,
      s.delivery_packaging === siteConfig.delivery.packaging,
      (s.social_instagram || "") === (siteConfig.social.instagram || ""),
      (s.social_facebook || "") === (siteConfig.social.facebook || ""),
    ];
    assert(checks.every(Boolean), "Site settings singleton matches siteConfig exactly");
  }

  console.log("\n[TEST 6] Deterministic SHA-256 Normalized Parity Hashes");
  console.log("--------------------------------------------------");

  // Normalized static collections vs db collections
  const normStaticCols = COLLECTIONS_META.map((c, i) => ({
    id: generateDeterministicUuid(VANTAIRE_NAMESPACE, `collection:${c.slug}`),
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    description: c.description,
    cover_image: c.coverImage,
    is_active: true,
    sort_order: i,
  }));
  const normDbCols = (dbCollections || []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    description: c.description,
    cover_image:
      (c.cover_image?.startsWith(`collections/${c.slug}/cover-`) ?? false) ||
      c.cover_image === `collections/collection-${c.slug}.jpg`
        ? `/images/collections/collection-${c.slug}.jpg`
        : c.cover_image,
    is_active: c.is_active,
    sort_order: c.sort_order,
  }));
  const hashStaticCols = sha256Hex(canonicalStringify(normStaticCols));
  const hashDbCols = sha256Hex(canonicalStringify(normDbCols));
  assert(hashStaticCols === hashDbCols, `Collections SHA-256 parity match: ${hashDbCols}`);

  // Normalized static products vs db products
  const normStaticProds = PRODUCTS.map((p, i) => ({
    id: generateDeterministicUuid(VANTAIRE_NAMESPACE, `product:${p.id}`),
    legacy_id: p.id,
    slug: p.slug,
    name: p.name,
    short_name: p.shortName,
    category: p.category,
    gender: p.gender,
    price: p.price,
    compare_at_price: p.compareAtPrice ?? null,
    currency: p.currency,
    currency_symbol: p.currencySymbol,
    description: p.description,
    short_description: p.shortDescription,
    frame_shape: p.frameShape,
    frame_look: p.frameLook,
    frame_color: p.frameColor,
    lens_color: p.lensColor,
    lens_type: p.lensType,
    style_category: p.styleCategory,
    fit: p.fit,
    features: p.features,
    badge: p.badge ?? null,
    featured: p.featured,
    best_seller: p.bestSeller,
    new_arrival: p.newArrival,
    in_stock: p.inStock,
    is_active: true,
    sort_order: i,
    seo_title: p.seoTitle,
    seo_description: p.seoDescription,
  }));
  const normDbProds = (dbProducts || []).map((p) => ({
    id: p.id,
    legacy_id: p.legacy_id,
    slug: p.slug,
    name: p.name,
    short_name: p.short_name,
    category: p.category,
    gender: p.gender,
    price: p.price,
    compare_at_price: p.compare_at_price,
    currency: p.currency,
    currency_symbol: p.currency_symbol,
    description: p.description,
    short_description: p.short_description,
    frame_shape: p.frame_shape,
    frame_look: p.frame_look,
    frame_color: p.frame_color,
    lens_color: p.lens_color,
    lens_type: p.lens_type,
    style_category: p.style_category,
    fit: p.fit,
    features: p.features,
    badge: p.badge,
    featured: p.featured,
    best_seller: p.best_seller,
    new_arrival: p.new_arrival,
    in_stock: p.in_stock,
    is_active: p.is_active,
    sort_order: p.sort_order,
    seo_title: p.seo_title,
    seo_description: p.seo_description,
  }));
  const hashStaticProds = sha256Hex(canonicalStringify(normStaticProds));
  const hashDbProds = sha256Hex(canonicalStringify(normDbProds));
  assert(hashStaticProds === hashDbProds, `Products SHA-256 parity match: ${hashDbProds}`);

  // Normalized memberships
  const normStaticMemberships: any[] = [];
  for (const col of COLLECTIONS_META) {
    const colUuid = generateDeterministicUuid(VANTAIRE_NAMESPACE, `collection:${col.slug}`);
    const prods = PRODUCTS.filter((p) => p.collection.includes(col.slug as any));
    prods.forEach((p, idx) => {
      normStaticMemberships.push({
        collection_id: colUuid,
        product_id: generateDeterministicUuid(VANTAIRE_NAMESPACE, `product:${p.id}`),
        position: idx,
      });
    });
  }
  const normDbMemberships = (dbMemberships || []).map((m) => ({
    collection_id: m.collection_id,
    product_id: m.product_id,
    position: m.position,
  }));

  const sortMemberships = (a: any, b: any) => {
    if (a.collection_id !== b.collection_id) {
      return a.collection_id.localeCompare(b.collection_id);
    }
    return a.position - b.position;
  };
  normStaticMemberships.sort(sortMemberships);
  normDbMemberships.sort(sortMemberships);

  const hashStaticMem = sha256Hex(canonicalStringify(normStaticMemberships));
  const hashDbMem = sha256Hex(canonicalStringify(normDbMemberships));
  assert(hashStaticMem === hashDbMem, `Memberships SHA-256 parity match: ${hashDbMem}`);

  // Normalized site settings
  const normStaticSettings = {
    id: 1,
    whatsapp_number: siteConfig.whatsapp.number,
    whatsapp_display_number: siteConfig.whatsapp.displayNumber,
    whatsapp_is_demo: siteConfig.whatsapp.isDemo,
    whatsapp_default_greeting: siteConfig.whatsapp.defaultGreeting,
    contact_phone: siteConfig.contact.phone,
    contact_email: siteConfig.contact.email,
    contact_hours: siteConfig.contact.hours,
    contact_friday_hours: siteConfig.contact.fridayHours,
    contact_location: siteConfig.contact.location,
    contact_service_area: siteConfig.contact.serviceArea,
    delivery_inside_dhaka_time: siteConfig.delivery.insideDhakaTime,
    delivery_outside_dhaka_time: siteConfig.delivery.outsideDhakaTime,
    delivery_fee_inside_dhaka: siteConfig.delivery.feeInsideDhaka,
    delivery_fee_outside_dhaka: siteConfig.delivery.feeOutsideDhaka,
    delivery_currency_symbol: siteConfig.delivery.currencySymbol,
    delivery_currency_code: siteConfig.delivery.currencyCode,
    delivery_cash_on_delivery: siteConfig.delivery.cashOnDelivery,
    delivery_advance_payment_note: siteConfig.delivery.advancePaymentNote,
    delivery_packaging: siteConfig.delivery.packaging,
    social_instagram: siteConfig.social.instagram || "",
    social_facebook: siteConfig.social.facebook || "",
  };
  const normDbSettings = s
    ? {
        id: s.id,
        whatsapp_number: s.whatsapp_number,
        whatsapp_display_number: s.whatsapp_display_number,
        whatsapp_is_demo: s.whatsapp_is_demo,
        whatsapp_default_greeting: s.whatsapp_default_greeting,
        contact_phone: s.contact_phone,
        contact_email: s.contact_email,
        contact_hours: s.contact_hours,
        contact_friday_hours: s.contact_friday_hours,
        contact_location: s.contact_location,
        contact_service_area: s.contact_service_area,
        delivery_inside_dhaka_time: s.delivery_inside_dhaka_time,
        delivery_outside_dhaka_time: s.delivery_outside_dhaka_time,
        delivery_fee_inside_dhaka: s.delivery_fee_inside_dhaka,
        delivery_fee_outside_dhaka: s.delivery_fee_outside_dhaka,
        delivery_currency_symbol: s.delivery_currency_symbol,
        delivery_currency_code: s.delivery_currency_code,
        delivery_cash_on_delivery: s.delivery_cash_on_delivery,
        delivery_advance_payment_note: s.delivery_advance_payment_note,
        delivery_packaging: s.delivery_packaging,
        social_instagram: s.social_instagram || "",
        social_facebook: s.social_facebook || "",
      }
    : null;
  const hashStaticSet = sha256Hex(canonicalStringify(normStaticSettings));
  const hashDbSet = sha256Hex(canonicalStringify(normDbSettings));
  assert(hashStaticSet === hashDbSet, `Site Settings SHA-256 parity match: ${hashDbSet}`);

  console.log("\n[TEST 7] Local Image Source Existence Check");
  console.log("--------------------------------------------------");

  let missingProductImages = 0;
  for (const p of PRODUCTS) {
    const primaryImg = p.images[0] || `/images/products/${p.id}-1.jpg`;
    const fullPath = path.resolve(process.cwd(), "public", primaryImg.replace(/^\//, ""));
    if (!fs.existsSync(fullPath)) {
      missingProductImages++;
      console.error(`  ❌ Missing product image on disk: ${primaryImg} (${fullPath})`);
    }
  }
  assert(missingProductImages === 0, `All 42 products have valid primary image files in public/ directory`);

  let missingCollectionImages = 0;
  for (const c of COLLECTIONS_META) {
    const fullPath = path.resolve(process.cwd(), "public", c.coverImage.replace(/^\//, ""));
    if (!fs.existsSync(fullPath)) {
      missingCollectionImages++;
      console.error(`  ❌ Missing collection cover image on disk: ${c.coverImage} (${fullPath})`);
    }
  }
  assert(missingCollectionImages === 0, `All 6 collections have valid cover images in public/ directory`);

  console.log("\n[TEST 8] Anonymous RLS Visibility & Write Security");
  console.log("--------------------------------------------------");

  const { data: anonProducts, error: anonProdErr } = await anonClient
    .from("products")
    .select("id, slug, is_active");
  assert(!anonProdErr && anonProducts?.length === 42, `Anon can read active products (received ${anonProducts?.length}/42)`);

  const { data: anonCollections, error: anonColErr } = await anonClient
    .from("collections")
    .select("id, slug, is_active");
  assert(!anonColErr && anonCollections?.length === 6, `Anon can read active collections (received ${anonCollections?.length}/6)`);

  const { data: anonMemberships, error: anonMemErr } = await anonClient
    .from("product_collections")
    .select("product_id, collection_id, position");
  assert(!anonMemErr && anonMemberships?.length === 63, `Anon can read product_collections (received ${anonMemberships?.length}/63)`);

  const { data: anonSettings, error: anonSetErr } = await anonClient
    .from("site_settings")
    .select("id, whatsapp_number");
  assert(!anonSetErr && anonSettings?.length === 1, `Anon can read site_settings (received ${anonSettings?.length}/1)`);

  // Anon write attempts must fail
  const { error: anonInsertProdErr } = await anonClient
    .from("products")
    .insert({
      legacy_id: "test-fake",
      slug: "test-fake",
      name: "Fake Product",
      short_name: "Fake",
      category: "Sunglasses",
      price: 1000,
      description: "Fake desc",
      short_description: "Fake short",
      frame_shape: "Round",
      frame_look: "Metal",
      frame_color: "Gold",
      lens_color: "Green",
      lens_type: "Tint",
      style_category: "Retro",
      fit: "Medium",
      seo_title: "Fake",
      seo_description: "Fake",
    } as any);
  assert(!!anonInsertProdErr, "Anon INSERT on products blocked by RLS");

  const { error: anonUpdateColErr } = await anonClient
    .from("collections")
    .update({ name: "Hacked Collection" } as any)
    .eq("slug", "aviator");
  const { data: verifyCol } = await adminClient.from("collections").select("name").eq("slug", "aviator").single();
  assert(verifyCol?.name === "The Aviator Edit", "Anon UPDATE on collections was blocked / had no effect");

  const { error: anonUpdateSetErr } = await anonClient
    .from("site_settings")
    .update({ whatsapp_number: "+8801999999999" } as any)
    .eq("id", 1);
  const { data: verifySet } = await adminClient.from("site_settings").select("whatsapp_number").eq("id", 1).single();
  assert(verifySet?.whatsapp_number === siteConfig.whatsapp.number, "Anon UPDATE on site_settings was blocked / had no effect");

  console.log("\n==================================================");
  console.log(`PARITY VERIFICATION SUMMARY: ${passedAssertions} PASSED, ${failedAssertions} FAILED`);
  console.log("==================================================");

  if (failedAssertions > 0) {
    process.exit(1);
  }
}

runParityVerification().catch((err) => {
  console.error("Unexpected error during parity verification:", err);
  process.exit(1);
});
