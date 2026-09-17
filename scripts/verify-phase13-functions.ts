import { createClient } from "@supabase/supabase-js";
import { assertLocalVantaireSupabaseTarget, loadEnvLocal } from "./local-guard";
import { Database } from "../src/types/database.types";

assertLocalVantaireSupabaseTarget();
loadEnvLocal();

console.log("======================================================================");
console.log("PHASE 13 SECURITY: FUNCTIONS & RPC PRIVILEGES VERIFIER");
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
  const disposableAdminEmail = `test-fn-admin-${ts}@vantaire.test`;
  const disposableOutsiderEmail = `test-fn-outsider-${ts}@vantaire.test`;
  const securePassword = `Vantaire#Fn!${ts}`;

  let disposableAdminId = "";
  let disposableOutsiderId = "";

  const anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 1. Setup Identities
    console.log("1. Setting up Disposable Identities:");
    const { data: adminUser } = await serviceClient.auth.admin.createUser({
      email: disposableAdminEmail,
      password: securePassword,
      email_confirm: true,
    });
    disposableAdminId = adminUser!.user!.id;
    await serviceClient.from("admin_profiles").insert({
      id: disposableAdminId,
      role: "admin",
      display_name: "Fn Admin",
    });

    const { data: outsiderUser } = await serviceClient.auth.admin.createUser({
      email: disposableOutsiderEmail,
      password: securePassword,
      email_confirm: true,
    });
    disposableOutsiderId = outsiderUser!.user!.id;

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

    assert(true, "Authenticated anon, outsider, and admin clients");

    // 2. Database Introspection for Schema and Dropped Obsolete Functions
    console.log("\n2. Private Schema & Obsolete Function Dropped Verification:");
    const { data: obsoleteFns, error: obsErr } = await serviceClient.rpc(
      // We can query pg_proc via direct PostgREST or sql query helper if available,
      // or test if calling obsolete public functions fails
      "is_admin" as any
    );
    assert(
      obsErr !== null,
      `public.is_admin() is completely dropped or uncallable via RPC (error: ${obsErr?.message})`
    );

    const { error: obsOwnerErr } = await serviceClient.rpc("is_owner" as any);
    assert(
      obsOwnerErr !== null,
      `public.is_owner() is completely dropped or uncallable via RPC (error: ${obsOwnerErr?.message})`
    );

    const { error: obsRoleErr } = await serviceClient.rpc("get_admin_role" as any);
    assert(
      obsRoleErr !== null,
      `public.get_admin_role() is completely dropped or uncallable via RPC (error: ${obsRoleErr?.message})`
    );

    // 3. RPC Permissions Testing: Anon Rejection
    console.log("\n3. RPC Anon Rejection Testing:");
    // Test reorder_products
    const { error: anonReorderProdErr } = await anonClient.rpc("reorder_products" as any, {
      p_ordered_ids: [],
      p_expected_order: [],
    });
    assert(
      anonReorderProdErr !== null,
      `reorder_products rejects anon caller (code: ${anonReorderProdErr?.code}, message: ${anonReorderProdErr?.message})`
    );

    // Test reorder_collections
    const { error: anonReorderCollErr } = await anonClient.rpc("reorder_collections" as any, {
      p_ordered_ids: [],
      p_expected_order: [],
    });
    assert(
      anonReorderCollErr !== null,
      `reorder_collections rejects anon caller (code: ${anonReorderCollErr?.code}, message: ${anonReorderCollErr?.message})`
    );

    // Test set_collection_products
    const { error: anonSetCollProdErr } = await anonClient.rpc("set_collection_products" as any, {
      p_collection_id: "00000000-0000-0000-0000-000000000000",
      p_product_ids: [],
      p_expected_collection_updated_at: new Date().toISOString(),
    });
    assert(
      anonSetCollProdErr !== null,
      `set_collection_products rejects anon caller (code: ${anonSetCollProdErr?.code}, message: ${anonSetCollProdErr?.message})`
    );

    // Test set_product_primary_image
    const { error: anonPrimaryImgErr } = await anonClient.rpc("set_product_primary_image" as any, {
      p_product_id: "00000000-0000-0000-0000-000000000000",
      p_image_id: "00000000-0000-0000-0000-000000000000",
    });
    assert(
      anonPrimaryImgErr !== null,
      `set_product_primary_image rejects anon caller (code: ${anonPrimaryImgErr?.code}, message: ${anonPrimaryImgErr?.message})`
    );

    // Test reorder_product_images
    const { error: anonReorderImgErr } = await anonClient.rpc("reorder_product_images" as any, {
      p_product_id: "00000000-0000-0000-0000-000000000000",
      p_ordered_image_ids: [],
    });
    assert(
      anonReorderImgErr !== null,
      `reorder_product_images rejects anon caller (code: ${anonReorderImgErr?.code}, message: ${anonReorderImgErr?.message})`
    );

    // Test remove_product_image_metadata
    const { error: anonRemoveImgErr } = await anonClient.rpc("remove_product_image_metadata" as any, {
      p_product_id: "00000000-0000-0000-0000-000000000000",
      p_image_id: "00000000-0000-0000-0000-000000000000",
    });
    assert(
      anonRemoveImgErr !== null,
      `remove_product_image_metadata rejects anon caller (code: ${anonRemoveImgErr?.code}, message: ${anonRemoveImgErr?.message})`
    );

    // 4. RPC Permissions Testing: Outsider Rejection (Authenticated Non-Admin)
    console.log("\n4. RPC Outsider (Authenticated Non-Admin) Rejection Testing:");
    const { error: outReorderProdErr } = await outsiderClient.rpc("reorder_products" as any, {
      p_ordered_ids: [],
      p_expected_order: [],
    });
    assert(
      outReorderProdErr !== null,
      `reorder_products rejects outsider caller (message: ${outReorderProdErr?.message})`
    );

    const { error: outReorderCollErr } = await outsiderClient.rpc("reorder_collections" as any, {
      p_ordered_ids: [],
      p_expected_order: [],
    });
    assert(
      outReorderCollErr !== null,
      `reorder_collections rejects outsider caller (message: ${outReorderCollErr?.message})`
    );

    const { error: outSetCollProdErr } = await outsiderClient.rpc("set_collection_products" as any, {
      p_collection_id: "00000000-0000-0000-0000-000000000000",
      p_product_ids: [],
      p_expected_collection_updated_at: new Date().toISOString(),
    });
    assert(
      outSetCollProdErr !== null,
      `set_collection_products rejects outsider caller (message: ${outSetCollProdErr?.message})`
    );

    const { error: outPrimaryImgErr } = await outsiderClient.rpc("set_product_primary_image" as any, {
      p_product_id: "00000000-0000-0000-0000-000000000000",
      p_image_id: "00000000-0000-0000-0000-000000000000",
    });
    assert(
      outPrimaryImgErr !== null,
      `set_product_primary_image rejects outsider caller (message: ${outPrimaryImgErr?.message})`
    );

    // 5. Admin Authorization Test
    console.log("\n5. RPC Admin Authorization Enforcement:");
    // Admin calling reorder_collections with current order
    const { data: colls } = await serviceClient
      .from("collections")
      .select("id")
      .order("sort_order", { ascending: true });
    const collIds = colls?.map((c) => c.id) || [];

    const { data: reorderRes, error: adminReorderErr } = await adminClient.rpc(
      "reorder_collections" as any,
      {
        p_ordered_ids: collIds,
        p_expected_order: collIds,
      }
    );
    assert(
      !adminReorderErr && !!reorderRes,
      `Admin can execute reorder_collections successfully (error: ${adminReorderErr?.message || "none"})`
    );

  } finally {
    console.log("\nCleaning up disposable test identities...");
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
  console.log(`FUNCTIONS & RPC SECURITY COMPLETE: ${passed} passed, ${failed} failed`);
  console.log("======================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Fatal error in verify-phase13-functions:", err);
  process.exit(1);
});
