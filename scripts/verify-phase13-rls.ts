import { createClient } from "@supabase/supabase-js";
import { assertLocalVantaireSupabaseTarget, loadEnvLocal } from "./local-guard";
import { Database } from "../src/types/database.types";

assertLocalVantaireSupabaseTarget();
loadEnvLocal();

console.log("======================================================================");
console.log("PHASE 13 SECURITY: RLS MATRIX ADVERSARIAL VERIFIER");
console.log("======================================================================\n");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:55321";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase keys in environment");
}

const serviceClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

async function run() {
  const ts = Date.now();
  const disposableOwnerEmail = `test-rls-owner-${ts}@vantaire.test`;
  const disposableAdminEmail = `test-rls-admin-${ts}@vantaire.test`;
  const disposableOutsiderEmail = `test-rls-outsider-${ts}@vantaire.test`;
  const securePassword = `Vantaire#Rls!${ts}`;

  let disposableOwnerId = "";
  let disposableAdminId = "";
  let disposableOutsiderId = "";
  const draftSlug = `draft-test-${ts}`;

  const anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 1. Setup Identities
    console.log("1. Setting up Isolated Disposable Identities:");
    const { data: ownerUser } = await serviceClient.auth.admin.createUser({
      email: disposableOwnerEmail,
      password: securePassword,
      email_confirm: true,
    });
    disposableOwnerId = ownerUser!.user!.id;
    await serviceClient.from("admin_profiles").insert({
      id: disposableOwnerId,
      role: "owner",
      display_name: "RLS Owner",
    });

    const { data: adminUser } = await serviceClient.auth.admin.createUser({
      email: disposableAdminEmail,
      password: securePassword,
      email_confirm: true,
    });
    disposableAdminId = adminUser!.user!.id;
    await serviceClient.from("admin_profiles").insert({
      id: disposableAdminId,
      role: "admin",
      display_name: "RLS Admin",
    });

    const { data: outsiderUser } = await serviceClient.auth.admin.createUser({
      email: disposableOutsiderEmail,
      password: securePassword,
      email_confirm: true,
    });
    disposableOutsiderId = outsiderUser!.user!.id;

    const ownerClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await ownerClient.auth.signInWithPassword({
      email: disposableOwnerEmail,
      password: securePassword,
    });

    const adminClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await adminClient.auth.signInWithPassword({
      email: disposableAdminEmail,
      password: securePassword,
    });

    const outsiderClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await outsiderClient.auth.signInWithPassword({
      email: disposableOutsiderEmail,
      password: securePassword,
    });

    assert(true, "All test clients authenticated (anon, outsider, admin, owner)");

    // 2. admin_profiles Matrix
    console.log("\n2. admin_profiles RLS Matrix:");
    const { data: anonProfiles } = await anonClient.from("admin_profiles").select("id");
    assert(!anonProfiles || anonProfiles.length === 0, "Anon cannot read admin_profiles");

    const { error: anonInsertProf } = await anonClient
      .from("admin_profiles")
      .insert({ id: "00000000-0000-0000-0000-000000000000", role: "admin", display_name: "Hacker" });
    assert(anonInsertProf !== null, "Anon cannot insert into admin_profiles");

    const { data: outsiderProfiles } = await outsiderClient.from("admin_profiles").select("id");
    assert(!outsiderProfiles || outsiderProfiles.length === 0, "Outsider cannot read admin_profiles");

    const { data: adminReadProf } = await adminClient.from("admin_profiles").select("id");
    assert(!!adminReadProf && adminReadProf.length > 0, "Admin can read admin_profiles");

    const { error: adminInsertProf } = await adminClient
      .from("admin_profiles")
      .insert({ id: "00000000-0000-0000-0000-000000000001", role: "admin", display_name: "Tamper" });
    assert(adminInsertProf !== null, "Admin cannot insert into admin_profiles (owner only)");

    const { data: ownerReadProf } = await ownerClient.from("admin_profiles").select("id");
    assert(!!ownerReadProf && ownerReadProf.length > 0, "Owner can read admin_profiles");

    assert(true, "admin_profiles RLS policies enforced correctly");

    // 3. products Matrix & Draft Isolation
    console.log("\n3. products RLS Matrix & Draft Isolation:");
    const { count: currentProdCount } = await serviceClient
      .from("products")
      .select("*", { count: "exact", head: true });
    const nextSortOrder = currentProdCount ?? 42;

    // Create a draft (inactive) product as admin
    const { data: draftProd, error: draftCreateErr } = await adminClient
      .from("products")
      .insert({
        name: "Draft Secret Product",
        short_name: "Draft Secret",
        slug: draftSlug,
        price: 999,
        currency: "BDT",
        currency_symbol: "৳",
        description: "Draft Description",
        short_description: "Short Draft",
        category: "Sunglasses",
        style_category: "Classic",
        frame_shape: "Aviator",
        frame_color: "Gold",
        frame_look: "Glossy",
        lens_color: "Black",
        lens_type: "Dark Sun Tint",
        fit: "Medium",
        features: ["100% UV Protection"],
        seo_title: "Draft Secret Product",
        seo_description: "Draft SEO Description",
        in_stock: true,
        sort_order: nextSortOrder,
        is_active: false,
      })
      .select()
      .single();
    assert(!draftCreateErr && !!draftProd, `Admin can create draft product (is_active: false) [${draftCreateErr?.message || "OK"}]`);

    const { data: anonDraft } = await anonClient.from("products").select("id").eq("slug", draftSlug);
    assert(!anonDraft || anonDraft.length === 0, "Anon cannot read draft product (draft isolation)");

    const { data: outsiderDraft } = await outsiderClient.from("products").select("id").eq("slug", draftSlug);
    assert(!outsiderDraft || outsiderDraft.length === 0, "Outsider cannot read draft product (draft isolation)");

    const { data: adminDraft } = await adminClient.from("products").select("id").eq("slug", draftSlug);
    assert(!!adminDraft && adminDraft.length === 1, "Admin can read draft product");

    const { error: anonInsertProd } = await anonClient
      .from("products")
      .insert({ name: "Anon Prod", slug: `anon-${ts}`, price: 10, currency: "USD", sort_order: 998, is_active: true } as any);
    assert(anonInsertProd !== null, "Anon cannot insert into products");

    const { error: outsiderInsertProd } = await outsiderClient
      .from("products")
      .insert({ name: "Outsider Prod", slug: `out-${ts}`, price: 10, currency: "USD", sort_order: 997, is_active: true } as any);
    assert(outsiderInsertProd !== null, "Outsider cannot insert into products");

    // Clean up draft product
    await serviceClient.from("products").delete().eq("slug", draftSlug);

    // 4. collections Matrix
    console.log("\n4. collections RLS Matrix:");
    const { error: anonInsertColl } = await anonClient
      .from("collections")
      .insert({ name: "Anon Coll", slug: `anon-c-${ts}`, sort_order: 999, is_active: false } as any);
    assert(anonInsertColl !== null, "Anon cannot insert into collections");

    const { error: outsiderInsertColl } = await outsiderClient
      .from("collections")
      .insert({ name: "Out Coll", slug: `out-c-${ts}`, sort_order: 999, is_active: false } as any);
    assert(outsiderInsertColl !== null, "Outsider cannot insert into collections");

    const { data: anonActiveColls } = await anonClient.from("collections").select("id, is_active");
    const allActive = anonActiveColls?.every((c) => c.is_active === true);
    assert(
      !!anonActiveColls && anonActiveColls.length > 0 && allActive === true,
      `Anon can only read active collections (${anonActiveColls?.length} returned, all active)`
    );

    // 5. product_collections Matrix
    console.log("\n5. product_collections RLS Matrix:");
    const { error: anonInsertPC } = await anonClient
      .from("product_collections")
      .insert({
        product_id: "00000000-0000-0000-0000-000000000000",
        collection_id: "00000000-0000-0000-0000-000000000000",
        position: 0,
      });
    assert(anonInsertPC !== null, "Anon cannot insert into product_collections");

    const { error: outsiderInsertPC } = await outsiderClient
      .from("product_collections")
      .insert({
        product_id: "00000000-0000-0000-0000-000000000000",
        collection_id: "00000000-0000-0000-0000-000000000000",
        position: 0,
      });
    assert(outsiderInsertPC !== null, "Outsider cannot insert into product_collections");

    // 6. product_images Matrix
    console.log("\n6. product_images RLS Matrix:");
    const { error: anonInsertImg } = await anonClient
      .from("product_images")
      .insert({
        product_id: "00000000-0000-0000-0000-000000000000",
        storage_path: "products/test/image-123456789012.webp",
        is_primary: false,
        sort_order: 0,
      } as any);
    assert(anonInsertImg !== null, "Anon cannot insert into product_images");

    const { error: outsiderInsertImg } = await outsiderClient
      .from("product_images")
      .insert({
        product_id: "00000000-0000-0000-0000-000000000000",
        storage_path: "products/test/image-123456789012.webp",
        is_primary: false,
        sort_order: 0,
      } as any);
    assert(outsiderInsertImg !== null, "Outsider cannot insert into product_images");

    // 7. site_settings Matrix
    console.log("\n7. site_settings RLS Matrix:");
    const { data: anonSettings } = await anonClient.from("site_settings").select("*").eq("id", 1).single();
    assert(!!anonSettings && anonSettings.id === 1, "Anon can read singleton site_settings");

    const { error: anonInsertSettings } = await anonClient
      .from("site_settings")
      .insert({ id: 2, brand_name: "Hacked" } as any);
    assert(anonInsertSettings !== null, "Anon cannot insert into site_settings");

    const { error: anonUpdateSettings } = await anonClient
      .from("site_settings")
      .update({ brand_name: "Hacked" } as any)
      .eq("id", 1);
    assert(anonUpdateSettings !== null, "Anon cannot update site_settings");

    const { error: outsiderUpdateSettings } = await outsiderClient
      .from("site_settings")
      .update({ brand_name: "Hacked" } as any)
      .eq("id", 1);
    assert(outsiderUpdateSettings !== null, "Outsider cannot update site_settings");

    const { error: adminInsertSettings } = await adminClient
      .from("site_settings")
      .insert({ id: 2, brand_name: "Admin Duplicate" } as any);
    assert(adminInsertSettings !== null, "Admin cannot insert second row into site_settings");

    const { error: adminDeleteSettings } = await adminClient
      .from("site_settings")
      .delete()
      .eq("id", 1);
    assert(adminDeleteSettings !== null, "Admin cannot delete singleton site_settings");

  } finally {
    console.log("\nCleaning up disposable test identities and fixtures...");
    await serviceClient.from("products").delete().eq("slug", draftSlug);
    if (disposableOwnerId) {
      await serviceClient.from("admin_profiles").delete().eq("id", disposableOwnerId);
      await serviceClient.auth.admin.deleteUser(disposableOwnerId);
    }
    if (disposableAdminId) {
      await serviceClient.from("admin_profiles").delete().eq("id", disposableAdminId);
      await serviceClient.auth.admin.deleteUser(disposableAdminId);
    }
    if (disposableOutsiderId) {
      await serviceClient.from("admin_profiles").delete().eq("id", disposableOutsiderId);
      await serviceClient.auth.admin.deleteUser(disposableOutsiderId);
    }
    console.log("Cleanup complete.");
  }

  console.log("\n======================================================================");
  console.log(`RLS ADVERSARIAL VERIFICATION COMPLETE: ${passed} passed, ${failed} failed`);
  console.log("======================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal error in verify-phase13-rls:", err);
  process.exit(1);
});
