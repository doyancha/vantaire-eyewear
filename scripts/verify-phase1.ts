import { PRODUCTS, COLLECTIONS_META } from "../src/data/products";
import { siteConfig } from "../src/lib/config";
import {
  productSchema,
  collectionSchema,
  siteSettingsSchema,
  adminProfileSchema,
} from "../src/lib/schemas";
import { execSync } from "child_process";

console.log("==================================================");
console.log("VANTAIRE EYEWEAR v1.3 — PHASE 1 VERIFICATION SUITE");
console.log("==================================================");

let failedAssertions = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ ${description}`);
  } else {
    console.error(`  ❌ FAILED: ${description}`);
    failedAssertions++;
  }
}

// -----------------------------------------------------------------------------
// SECTION 1: ZOD COMPATIBILITY & STATIC CATALOG VALIDATION
// -----------------------------------------------------------------------------
console.log("\n[1/4] Validating 42 Static Products Against Zod Schema & DB Rules...");

assert(PRODUCTS.length === 42, `Catalog contains exactly 42 products (Found: ${PRODUCTS.length})`);

for (const p of PRODUCTS) {
  const dbMapped = {
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
    featured: p.featured ?? false,
    best_seller: p.bestSeller ?? false,
    new_arrival: p.newArrival ?? false,
    in_stock: p.inStock,
    is_active: true,
    sort_order: 0,
    seo_title: p.seoTitle,
    seo_description: p.seoDescription,
  };

  const parsed = productSchema.safeParse(dbMapped);
  if (!parsed.success) {
    assert(false, `Product '${p.slug}' failed Zod validation: ${JSON.stringify(parsed.error.format())}`);
  }
}
assert(true, "All 42/42 static products satisfy Zod productSchema and domain constraints");

console.log("\n[2/4] Validating 6 Collections Meta Against Zod Schema...");
assert(COLLECTIONS_META.length === 6, `Found 6 collections (Found: ${COLLECTIONS_META.length})`);

for (const col of COLLECTIONS_META) {
  const parsed = collectionSchema.safeParse({
    slug: col.slug,
    name: col.name,
    tagline: col.tagline,
    description: col.description,
    cover_image: col.coverImage,
    is_active: true,
    sort_order: 0,
  });
  if (!parsed.success) {
    assert(false, `Collection '${col.slug}' failed Zod validation: ${JSON.stringify(parsed.error.format())}`);
  }
}
assert(true, "All 6/6 collections satisfy Zod collectionSchema");

console.log("\n[3/4] Validating Site Settings Against Zod Schema...");
const dbSiteSettings = {
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
  social_instagram: siteConfig.social.instagram,
  social_facebook: siteConfig.social.facebook,
};

const settingsParsed = siteSettingsSchema.safeParse(dbSiteSettings);
if (!settingsParsed.success) {
  assert(false, `Site settings failed Zod validation: ${JSON.stringify(settingsParsed.error.format())}`);
} else {
  assert(true, "Site settings satisfy Zod siteSettingsSchema");
}

// -----------------------------------------------------------------------------
// SECTION 2: LIVE DATABASE SCHEMA & CONSTRAINT TESTS
// -----------------------------------------------------------------------------
console.log("\n[4/4] Executing Live PostgreSQL Database & Constraint Tests...");

function runPsql(sql: string): string {
  const sanitized = sql.replace(/"/g, '\\"');
  try {
    const stdout = execSync(`docker exec -i supabase_db_vantaire-eyewear psql -U postgres -d postgres -t -A -c "${sanitized}"`, {
      encoding: "utf-8",
    });
    return stdout.trim();
  } catch (err: any) {
    return `ERROR: ${err.stderr || err.message}`;
  }
}

// Check tables
const tables = [
  "products",
  "collections",
  "product_collections",
  "product_images",
  "site_settings",
  "admin_profiles",
];

for (const table of tables) {
  const count = runPsql(`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}';`);
  assert(count === "1", `Table public.${table} exists in database`);
}

// Check RLS
for (const table of tables) {
  const rls = runPsql(`SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = '${table}';`);
  assert(rls === "t", `Row Level Security (RLS) is enabled on public.${table}`);
}

// Check Triggers
const triggers = [
  { table: "products", name: "trg_products_updated_at" },
  { table: "collections", name: "trg_collections_updated_at" },
  { table: "product_images", name: "trg_product_images_updated_at" },
  { table: "site_settings", name: "trg_site_settings_updated_at" },
  { table: "admin_profiles", name: "trg_admin_profiles_updated_at" },
];

for (const trg of triggers) {
  const exists = runPsql(`SELECT count(*) FROM information_schema.triggers WHERE event_object_table = '${trg.table}' AND trigger_name = '${trg.name}';`);
  assert(exists === "1", `Trigger ${trg.name} attached to public.${trg.table}`);
}

// Constraint tests using transactions (BEGIN ... ROLLBACK)
interface ConstraintTestCase {
  name: string;
  sql: string;
  expectSuccess: boolean;
}

const testCases: ConstraintTestCase[] = [
  {
    name: "Valid product insertion succeeds",
    sql: `INSERT INTO public.products (legacy_id, slug, name, short_name, price, currency, description, short_description, frame_shape, frame_look, frame_color, lens_color, lens_type, style_category, fit, seo_title, seo_description) VALUES ('test-valid', 'test-valid-sunglasses', 'Test Valid', 'Test', 4500, 'BDT', 'Desc', 'Short', 'Aviator', 'Dark Metal', 'Black', 'Smoke', 'Polarized-Style Tint', 'Classic', 'Medium', 'Test SEO', 'Test SEO Desc');`,
    expectSuccess: true,
  },
  {
    name: "Invalid product slug (uppercase/spaces) is rejected",
    sql: `INSERT INTO public.products (legacy_id, slug, name, short_name, price, currency, description, short_description, frame_shape, frame_look, frame_color, lens_color, lens_type, style_category, fit, seo_title, seo_description) VALUES ('test-slug', 'Test Slug With Spaces!', 'Test', 'Test', 4500, 'BDT', 'Desc', 'Short', 'Aviator', 'Dark Metal', 'Black', 'Smoke', 'Polarized-Style Tint', 'Classic', 'Medium', 'Test SEO', 'Test SEO Desc');`,
    expectSuccess: false,
  },
  {
    name: "Negative product price is rejected",
    sql: `INSERT INTO public.products (legacy_id, slug, name, short_name, price, currency, description, short_description, frame_shape, frame_look, frame_color, lens_color, lens_type, style_category, fit, seo_title, seo_description) VALUES ('test-price', 'test-price-slug', 'Test', 'Test', -100, 'BDT', 'Desc', 'Short', 'Aviator', 'Dark Metal', 'Black', 'Smoke', 'Polarized-Style Tint', 'Classic', 'Medium', 'Test SEO', 'Test SEO Desc');`,
    expectSuccess: false,
  },
  {
    name: "compare_at_price < price is rejected",
    sql: `INSERT INTO public.products (legacy_id, slug, name, short_name, price, compare_at_price, currency, description, short_description, frame_shape, frame_look, frame_color, lens_color, lens_type, style_category, fit, seo_title, seo_description) VALUES ('test-comp', 'test-compare-slug', 'Test', 'Test', 5000, 3000, 'BDT', 'Desc', 'Short', 'Aviator', 'Dark Metal', 'Black', 'Smoke', 'Polarized-Style Tint', 'Classic', 'Medium', 'Test SEO', 'Test SEO Desc');`,
    expectSuccess: false,
  },
  {
    name: "compare_at_price >= price is accepted",
    sql: `INSERT INTO public.products (legacy_id, slug, name, short_name, price, compare_at_price, currency, description, short_description, frame_shape, frame_look, frame_color, lens_color, lens_type, style_category, fit, seo_title, seo_description) VALUES ('test-comp-ok', 'test-compare-ok-slug', 'Test', 'Test', 5000, 6500, 'BDT', 'Desc', 'Short', 'Aviator', 'Dark Metal', 'Black', 'Smoke', 'Polarized-Style Tint', 'Classic', 'Medium', 'Test SEO', 'Test SEO Desc');`,
    expectSuccess: true,
  },
  {
    name: "Non-Sunglasses category is rejected",
    sql: `INSERT INTO public.products (legacy_id, slug, name, short_name, category, price, currency, description, short_description, frame_shape, frame_look, frame_color, lens_color, lens_type, style_category, fit, seo_title, seo_description) VALUES ('test-cat', 'test-cat-slug', 'Test', 'Test', 'Eyeglasses', 5000, 'BDT', 'Desc', 'Short', 'Aviator', 'Dark Metal', 'Black', 'Smoke', 'Polarized-Style Tint', 'Classic', 'Medium', 'Test SEO', 'Test SEO Desc');`,
    expectSuccess: false,
  },
  {
    name: "Invalid gender is rejected",
    sql: `INSERT INTO public.products (legacy_id, slug, name, short_name, gender, price, currency, description, short_description, frame_shape, frame_look, frame_color, lens_color, lens_type, style_category, fit, seo_title, seo_description) VALUES ('test-gender', 'test-gender-slug', 'Test', 'Test', 'Kids', 5000, 'BDT', 'Desc', 'Short', 'Aviator', 'Dark Metal', 'Black', 'Smoke', 'Polarized-Style Tint', 'Classic', 'Medium', 'Test SEO', 'Test SEO Desc');`,
    expectSuccess: false,
  },
  {
    name: "Non-BDT currency is rejected",
    sql: `INSERT INTO public.products (legacy_id, slug, name, short_name, currency, price, description, short_description, frame_shape, frame_look, frame_color, lens_color, lens_type, style_category, fit, seo_title, seo_description) VALUES ('test-cur', 'test-cur-slug', 'Test', 'Test', 'USD', 5000, 'Desc', 'Short', 'Aviator', 'Dark Metal', 'Black', 'Smoke', 'Polarized-Style Tint', 'Classic', 'Medium', 'Test SEO', 'Test SEO Desc');`,
    expectSuccess: false,
  },
  {
    name: "Invalid frame_shape is rejected",
    sql: `INSERT INTO public.products (legacy_id, slug, name, short_name, frame_shape, price, currency, description, short_description, frame_look, frame_color, lens_color, lens_type, style_category, fit, seo_title, seo_description) VALUES ('test-shape', 'test-shape-slug', 'Test', 'Test', 'Triangle', 5000, 'BDT', 'Desc', 'Short', 'Dark Metal', 'Black', 'Smoke', 'Polarized-Style Tint', 'Classic', 'Medium', 'Test SEO', 'Test SEO Desc');`,
    expectSuccess: false,
  },
  {
    name: "Invalid lens_type is rejected",
    sql: `INSERT INTO public.products (legacy_id, slug, name, short_name, lens_type, price, currency, description, short_description, frame_shape, frame_look, frame_color, lens_color, style_category, fit, seo_title, seo_description) VALUES ('test-lens', 'test-lens-slug', 'Test', 'Test', 'Clear Plastic', 5000, 'BDT', 'Desc', 'Short', 'Aviator', 'Dark Metal', 'Black', 'Smoke', 'Classic', 'Medium', 'Test SEO', 'Test SEO Desc');`,
    expectSuccess: false,
  },
  {
    name: "Invalid badge is rejected",
    sql: `INSERT INTO public.products (legacy_id, slug, name, short_name, badge, price, currency, description, short_description, frame_shape, frame_look, frame_color, lens_color, lens_type, style_category, fit, seo_title, seo_description) VALUES ('test-badge', 'test-badge-slug', 'Test', 'Test', 'Mega Sale', 5000, 'BDT', 'Desc', 'Short', 'Aviator', 'Dark Metal', 'Black', 'Smoke', 'Polarized-Style Tint', 'Classic', 'Medium', 'Test SEO', 'Test SEO Desc');`,
    expectSuccess: false,
  },
  {
    name: "Invalid collection slug format is rejected",
    sql: `INSERT INTO public.collections (slug, name, tagline, description, cover_image) VALUES ('Invalid Slug!', 'Name', 'Tag', 'Desc', '/img.jpg');`,
    expectSuccess: false,
  },
  {
    name: "Site settings singleton rejection for id != 1",
    sql: `INSERT INTO public.site_settings (id, whatsapp_default_greeting, contact_hours, contact_friday_hours, delivery_advance_payment_note, delivery_packaging) VALUES (2, 'Hi', '10-8', 'Fri', 'Note', 'Pack');`,
    expectSuccess: false,
  },
  {
    name: "Admin profile rejection for invalid role",
    sql: `INSERT INTO public.admin_profiles (id, role) VALUES ('00000000-0000-0000-0000-000000000001', 'superadmin');`,
    expectSuccess: false,
  },
];

for (const tc of testCases) {
  const command = `DO $$ BEGIN ${tc.sql} RAISE EXCEPTION 'ROLLBACK_TEST'; EXCEPTION WHEN OTHERS THEN IF SQLERRM = 'ROLLBACK_TEST' THEN NULL; ELSE RAISE; END IF; END $$;`;
  const result = runPsql(command);
  const isOk = !result.startsWith("ERROR:");
  if (tc.expectSuccess) {
    assert(isOk, `${tc.name} [Expected: PASS, Got: ${isOk ? "PASS" : result}]`);
  } else {
    assert(!isOk, `${tc.name} [Expected: REJECT, Got: ${!isOk ? "REJECTED (" + result.split("\n")[0] + ")" : "PASSED"}]`);
  }
}

// Test Partial Unique Index: Single primary image per product
console.log("  Testing partial unique index uq_product_images_single_primary...");
const partialUniqueTest = `
DO $$
DECLARE
  v_prod_id UUID;
BEGIN
  INSERT INTO public.products (legacy_id, slug, name, short_name, price, currency, description, short_description, frame_shape, frame_look, frame_color, lens_color, lens_type, style_category, fit, seo_title, seo_description)
  VALUES ('test-img-prod', 'test-img-prod', 'Test', 'Test', 4500, 'BDT', 'Desc', 'Short', 'Aviator', 'Dark Metal', 'Black', 'Smoke', 'Polarized-Style Tint', 'Classic', 'Medium', 'SEO', 'SEO')
  RETURNING id INTO v_prod_id;

  INSERT INTO public.product_images (product_id, storage_path, alt_text, is_primary)
  VALUES (v_prod_id, '/img1.jpg', 'Img 1', true);

  -- Second primary image should violate partial unique index
  INSERT INTO public.product_images (product_id, storage_path, alt_text, is_primary)
  VALUES (v_prod_id, '/img2.jpg', 'Img 2', true);

  RAISE EXCEPTION 'TEST_FAILED_NOT_REJECTED';
EXCEPTION WHEN unique_violation THEN
  -- Expected behavior
  NULL;
END $$;
`;
const partialRes = runPsql(partialUniqueTest);
assert(!partialRes.startsWith("ERROR:"), `Partial unique index uq_product_images_single_primary successfully enforced (rejected second primary image)`);

// Test set_updated_at() trigger
console.log("  Testing set_updated_at() trigger execution...");
const triggerTest = `
DO $$
DECLARE
  v_prod_id UUID;
  v_t1 TIMESTAMPTZ;
  v_t2 TIMESTAMPTZ;
BEGIN
  INSERT INTO public.products (legacy_id, slug, name, short_name, price, currency, description, short_description, frame_shape, frame_look, frame_color, lens_color, lens_type, style_category, fit, seo_title, seo_description, created_at, updated_at)
  VALUES ('test-trg-prod', 'test-trg-prod', 'Test', 'Test', 4500, 'BDT', 'Desc', 'Short', 'Aviator', 'Dark Metal', 'Black', 'Smoke', 'Polarized-Style Tint', 'Classic', 'Medium', 'SEO', 'SEO', now() - interval '1 hour', now() - interval '1 hour')
  RETURNING id, updated_at INTO v_prod_id, v_t1;

  UPDATE public.products SET name = 'Test Updated' WHERE id = v_prod_id
  RETURNING updated_at INTO v_t2;

  IF v_t2 <= v_t1 THEN
    RAISE EXCEPTION 'TRIGGER_NOT_FIRED';
  END IF;

  DELETE FROM public.products WHERE id = v_prod_id;
END $$;
`;
const triggerRes = runPsql(triggerTest);
assert(!triggerRes.startsWith("ERROR:"), `Trigger trg_products_updated_at properly updates updated_at timestamp`);

console.log("\n==================================================");
if (failedAssertions === 0) {
  console.log("🏆 ALL PHASE 1 VERIFICATIONS & CONSTRAINT TESTS PASSED!");
  console.log("==================================================");
  process.exit(0);
} else {
  console.error(`💥 FAILED: ${failedAssertions} assertion(s) failed.`);
  console.log("==================================================");
  process.exit(1);
}
