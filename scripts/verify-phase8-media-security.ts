import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../src/types/database.types";

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
const ANON_KEY: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SERVICE_ROLE_KEY: string = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error("Required Supabase credentials missing from environment / .env.local");
}

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

async function callPostgrest(
  endpoint: string,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  token?: string,
  body?: any
) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers: Record<string, string> = {
    apikey: ANON_KEY,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

async function callRpc(
  fnName: string,
  token?: string,
  params?: any
) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fnName}`;
  const headers: Record<string, string> = {
    apikey: ANON_KEY,
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: params ? JSON.stringify(params) : "{}",
  });

  let data: any = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

async function runMediaSecurityVerification() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 8 MEDIA SECURITY VERIFICATION");
  console.log("==================================================");

  const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Establish authentic identities
  console.log("\n[1/5] Establishing Authenticated Security Test Contexts...");
  const runtimeSecret = crypto.randomBytes(16).toString("hex") + "!Aa1";

  async function ensureUser(email: string, role?: "owner" | "admin") {
    const { data: listData } = await adminClient.auth.admin.listUsers();
    let userId = listData?.users.find((u) => u.email === email)?.id;

    if (!userId) {
      const { data: created } = await adminClient.auth.admin.createUser({
        email,
        password: runtimeSecret,
        email_confirm: true,
      });
      userId = created.user?.id;
    } else {
      await adminClient.auth.admin.updateUserById(userId, { password: runtimeSecret });
    }

    if (role && userId) {
      await (adminClient.from("admin_profiles") as any).upsert({
        id: userId,
        role,
        display_name: `${role.toUpperCase()} User`,
      });
    } else if (userId) {
      await adminClient.from("admin_profiles").delete().eq("id", userId);
    }

    return userId!;
  }

  const adminId = await ensureUser("admin@vantaire.local", "admin");
  const outsiderId = await ensureUser("outsider@vantaire.local");

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: adminAuth } = await authClient.auth.signInWithPassword({
    email: "admin@vantaire.local",
    password: runtimeSecret,
  });
  const adminJwt = adminAuth.session?.access_token!;
  assert(Boolean(adminJwt), "Admin JWT acquired");

  const { data: outsiderAuth } = await authClient.auth.signInWithPassword({
    email: "outsider@vantaire.local",
    password: runtimeSecret,
  });
  const outsiderJwt = outsiderAuth.session?.access_token!;
  assert(Boolean(outsiderJwt), "Outsider JWT acquired");

  // Fetch an existing active product for test references
  const { data: existingProducts } = await adminClient
    .from("products")
    .select("id, slug")
    .eq("is_active", true)
    .limit(1);

  const sampleProd = existingProducts![0];

  // ---------------------------------------------------------------------------
  // [2/5] Anonymous Context RLS Guards & RPC Denials
  // ---------------------------------------------------------------------------
  console.log("\n[2/5] Verifying Anonymous Context RLS Guards & RPC Denials...");

  // Anonymous: INSERT product_images
  const anonInsert = await callPostgrest("product_images", "POST", undefined, {
    product_id: sampleProd.id,
    storage_path: `products/${sampleProd.slug}/image-anon-test.jpg`,
    alt_text: "Anonymous injection test",
  });
  assert(anonInsert.status >= 400, "Anonymous: product_images INSERT rejected by RLS");

  // Anonymous: UPDATE product_images
  const anonUpdate = await callPostgrest(
    `product_images?product_id=eq.${sampleProd.id}`,
    "PATCH",
    undefined,
    { alt_text: "Anonymous edit attempt" }
  );
  assert(
    anonUpdate.status >= 400 || (Array.isArray(anonUpdate.data) && anonUpdate.data.length === 0),
    "Anonymous: product_images UPDATE rejected by RLS"
  );

  // Anonymous: DELETE product_images
  const anonDelete = await callPostgrest(
    `product_images?product_id=eq.${sampleProd.id}`,
    "DELETE",
    undefined
  );
  assert(
    anonDelete.status >= 400 || (Array.isArray(anonDelete.data) && anonDelete.data.length === 0),
    "Anonymous: product_images DELETE rejected by RLS"
  );

  // Anonymous: RPC calls
  const anonRpc1 = await callRpc("set_product_primary_image", undefined, {
    p_product_id: sampleProd.id,
    p_image_id: crypto.randomUUID(),
  });
  assert(anonRpc1.status >= 400, "Anonymous: RPC set_product_primary_image strictly blocked");

  const anonRpc2 = await callRpc("reorder_product_images", undefined, {
    p_product_id: sampleProd.id,
    p_image_ids: [],
  });
  assert(anonRpc2.status >= 400, "Anonymous: RPC reorder_product_images strictly blocked");

  const anonRpc3 = await callRpc("remove_product_image_metadata", undefined, {
    p_product_id: sampleProd.id,
    p_image_id: crypto.randomUUID(),
  });
  assert(anonRpc3.status >= 400, "Anonymous: RPC remove_product_image_metadata strictly blocked");

  // ---------------------------------------------------------------------------
  // [3/5] Authenticated Outsider Context RLS Guards & RPC Denials
  // ---------------------------------------------------------------------------
  console.log("\n[3/5] Verifying Authenticated Outsider Context RLS Guards & RPC Denials...");

  const outsiderInsert = await callPostgrest("product_images", "POST", outsiderJwt, {
    product_id: sampleProd.id,
    storage_path: `products/${sampleProd.slug}/image-outsider.jpg`,
    alt_text: "Outsider injection test",
  });
  assert(outsiderInsert.status >= 400, "Outsider: product_images INSERT rejected by RLS");

  const outsiderUpdate = await callPostgrest(
    `product_images?product_id=eq.${sampleProd.id}`,
    "PATCH",
    outsiderJwt,
    { alt_text: "Outsider edit attempt" }
  );
  assert(
    outsiderUpdate.status >= 400 || (Array.isArray(outsiderUpdate.data) && outsiderUpdate.data.length === 0),
    "Outsider: product_images UPDATE rejected by RLS"
  );

  const outsiderDelete = await callPostgrest(
    `product_images?product_id=eq.${sampleProd.id}`,
    "DELETE",
    outsiderJwt
  );
  assert(
    outsiderDelete.status >= 400 || (Array.isArray(outsiderDelete.data) && outsiderDelete.data.length === 0),
    "Outsider: product_images DELETE rejected by RLS"
  );

  const outsiderRpc1 = await callRpc("set_product_primary_image", outsiderJwt, {
    p_product_id: sampleProd.id,
    p_image_id: crypto.randomUUID(),
  });
  assert(outsiderRpc1.status >= 400, "Outsider: RPC set_product_primary_image rejected (insufficient_privilege)");

  const outsiderRpc2 = await callRpc("reorder_product_images", outsiderJwt, {
    p_product_id: sampleProd.id,
    p_image_ids: [],
  });
  assert(outsiderRpc2.status >= 400, "Outsider: RPC reorder_product_images rejected (insufficient_privilege)");

  const outsiderRpc3 = await callRpc("remove_product_image_metadata", outsiderJwt, {
    p_product_id: sampleProd.id,
    p_image_id: crypto.randomUUID(),
  });
  assert(outsiderRpc3.status >= 400, "Outsider: RPC remove_product_image_metadata rejected (insufficient_privilege)");

  // ---------------------------------------------------------------------------
  // [4/5] Admin Integrity Invariants & Trigger Enforcements
  // ---------------------------------------------------------------------------
  console.log("\n[4/5] Testing Admin Integrity Invariants & Database Triggers...");

  // Invariant 1: Inserting product directly with is_active = true must fail RLS
  const activeProdInsert = await callPostgrest("products", "POST", adminJwt, {
    slug: `phase8-active-test-${Date.now()}`,
    name: "Active Direct Insert Test",
    short_name: "Active Direct",
    category: "Sunglasses",
    gender: "Unisex",
    price: 3500,
    description: "Testing active insert restriction",
    short_description: "Active insert test",
    frame_shape: "Square",
    frame_look: "Metal",
    frame_color: "Gold",
    lens_color: "Green",
    lens_type: "Tinted",
    style_category: "Classic",
    fit: "Universal",
    features: ["Feature A"],
    seo_title: "Active Direct Insert",
    seo_description: "Active direct insert test",
    is_active: true, // MUST BE BLOCKED BY products_insert_admin
  });
  assert(
    activeProdInsert.status >= 400,
    "RLS Policy: products_insert_admin strictly blocks inserting products with is_active = true"
  );

  // Create an inactive draft product for subsequent tests
  const draftSlug = `phase8-guard-prod-${Date.now()}`;
  const draftCreate = await callPostgrest("products", "POST", adminJwt, {
    slug: draftSlug,
    name: "Phase 8 Guard Verification",
    short_name: "Guard Verification",
    category: "Sunglasses",
    gender: "Unisex",
    price: 3200,
    currency: "BDT",
    currency_symbol: "৳",
    description: "Product for testing Phase 8 database triggers",
    short_description: "Guard test",
    frame_shape: "Round",
    frame_look: "Tortoise",
    frame_color: "Havana",
    lens_color: "Brown",
    lens_type: "Polarized-Style Tint",
    style_category: "Classic",
    fit: "Universal",
    features: ["Feature 1"],
    seo_title: "Guard Verification Product",
    seo_description: "Guard verification test product",
    is_active: false,
    featured: false,
    best_seller: false,
    new_arrival: false,
    in_stock: true,
  });
  if (draftCreate.status !== 201) {
    console.error("draftCreate failed:", draftCreate.status, draftCreate.data);
  }
  assert(draftCreate.status === 201, "Admin: created draft product (is_active = false)");
  const draftProd = draftCreate.data[0];

  // Invariant 2: Activating product with 0 images must fail DB trigger
  const activateNoImages = await callPostgrest(
    `products?id=eq.${draftProd.id}`,
    "PATCH",
    adminJwt,
    { is_active: true }
  );
  assert(
    activateNoImages.status >= 400 &&
      (activateNoImages.data?.message?.includes("Cannot activate product without at least one image") ||
       activateNoImages.data?.details?.includes("at least one image")),
    "DB Trigger: trg_guard_product_activation blocks activating product with 0 images"
  );

  // Invariant 3: Storage path traversal prohibited
  const pathTraversal = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: draftProd.id,
    storage_path: `products/${draftProd.slug}/../evil/image-1234567890abcdef.jpg`,
    alt_text: "Traversal attack",
    is_primary: false,
  });
  assert(
    pathTraversal.status >= 400 && pathTraversal.data?.message?.includes("Invalid storage_path"),
    "DB Trigger: trg_guard_product_image_storage_path blocks path traversal (..)"
  );

  // Invariant 4: Storage path backslash prohibited
  const pathBackslash = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: draftProd.id,
    storage_path: `products\\${draftProd.slug}\\image-1234567890abcdef.jpg`,
    alt_text: "Backslash attack",
    is_primary: false,
  });
  assert(
    pathBackslash.status >= 400 && pathBackslash.data?.message?.includes("Invalid storage_path"),
    "DB Trigger: trg_guard_product_image_storage_path blocks backslashes"
  );

  // Invariant 5: Storage path external URL prohibited
  const pathProtocol = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: draftProd.id,
    storage_path: `https://evil.com/products/${draftProd.slug}/image-1234567890abcdef.jpg`,
    alt_text: "Protocol attack",
    is_primary: false,
  });
  assert(
    pathProtocol.status >= 400 && pathProtocol.data?.message?.includes("Invalid storage_path"),
    "DB Trigger: trg_guard_product_image_storage_path blocks external URLs (http/https)"
  );

  // Invariant 6: Storage path slug mismatch prohibited
  const pathSlugMismatch = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: draftProd.id,
    storage_path: `products/another-slug-hijack/image-1234567890abcdef.jpg`,
    alt_text: "Slug hijack attack",
    is_primary: false,
  });
  assert(
    pathSlugMismatch.status >= 400 && pathSlugMismatch.data?.message?.includes("must start with"),
    "DB Trigger: trg_guard_product_image_storage_path blocks mismatched product slug"
  );

  // Invariant 7: Storage path collections prefix prohibited
  const pathCollection = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: draftProd.id,
    storage_path: `collections/aviator/cover-1234567890abcdef.jpg`,
    alt_text: "Collection path hijack",
    is_primary: false,
  });
  assert(
    pathCollection.status >= 400 && pathCollection.data?.message?.includes("Invalid storage_path"),
    "DB Trigger: trg_guard_product_image_storage_path blocks collections/ prefix for product images"
  );

  // Invariant 8: Storage path nested subdirectory prohibited
  const pathNested = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: draftProd.id,
    storage_path: `products/${draftProd.slug}/nested/image-1234567890abcdef.jpg`,
    alt_text: "Nested path attack",
    is_primary: false,
  });
  assert(
    pathNested.status >= 400 && pathNested.data?.message?.includes("cannot have nested subdirectories"),
    "DB Trigger: trg_guard_product_image_storage_path blocks nested subdirectories"
  );

  // Invariant 9: Insert 5 valid images (Max capacity)
  const imageIds: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const hexHash = crypto.randomBytes(8).toString("hex");
    const ins = await callPostgrest("product_images", "POST", adminJwt, {
      product_id: draftProd.id,
      storage_path: `products/${draftProd.slug}/image-${hexHash}.jpg`,
      alt_text: `Valid image ${i}`,
      is_primary: i === 1,
      sort_order: i - 1,
    });
    assert(ins.status === 201, `Admin: uploaded valid image ${i}/5`);
    imageIds.push(ins.data[0].id);
  }

  // Invariant 10: Attempting to insert 6th image must fail DB trigger
  const hex6 = crypto.randomBytes(8).toString("hex");
  const ins6 = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: draftProd.id,
    storage_path: `products/${draftProd.slug}/image-${hex6}.jpg`,
    alt_text: "Image 6 over-limit attempt",
    is_primary: false,
    sort_order: 5,
  });
  assert(
    ins6.status >= 400 && ins6.data?.message?.includes("cannot have more than 5 images"),
    "DB Trigger: trg_guard_product_images_max_limit strictly blocks 6th image"
  );

  // Now activate the product (has 5 images, exactly 1 primary) -> MUST SUCCEED
  const activateSuccess = await callPostgrest(
    `products?id=eq.${draftProd.id}`,
    "PATCH",
    adminJwt,
    { is_active: true }
  );
  assert(activateSuccess.status === 200 && activateSuccess.data[0]?.is_active === true, "Product activation succeeds when exactly 1 primary image exists");

  // Invariant 11: Active product cannot remove sole image
  // Delete 4 images first
  for (let i = 1; i < imageIds.length; i++) {
    await callRpc("remove_product_image_metadata", adminJwt, {
      p_product_id: draftProd.id,
      p_image_id: imageIds[i],
    });
  }

  // Attempt to remove the 1 remaining image of an ACTIVE product
  const removeSoleImage = await callRpc("remove_product_image_metadata", adminJwt, {
    p_product_id: draftProd.id,
    p_image_id: imageIds[0],
  });
  assert(
    removeSoleImage.status >= 400 &&
      removeSoleImage.data?.message?.includes("Cannot remove the only image of an active product"),
    "RPC Guard: remove_product_image_metadata blocks deleting sole image of active product"
  );

  // ---------------------------------------------------------------------------
  // [5/5] Cleanup Fixtures & Baseline Verification
  // ---------------------------------------------------------------------------
  console.log("\n[5/5] Cleaning Up Fixtures & Verifying Clean Baseline...");

  // Deactivate product before deleting image
  await adminClient.from("products").update({ is_active: false }).eq("id", draftProd.id);
  await adminClient.from("product_images").delete().eq("product_id", draftProd.id);
  // Delete the test product using adminClient
  await adminClient.from("products").delete().eq("id", draftProd.id);

  // Verify baseline
  const { count: prodCount } = await adminClient
    .from("products")
    .select("id", { count: "exact", head: true });
  assert(prodCount === 42, `Clean baseline: exactly 42 products in database (got ${prodCount})`);

  const { count: activeCount } = await adminClient
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  assert(activeCount === 42, `Clean baseline: exactly 42 active products (got ${activeCount})`);

  const { count: imgCount } = await adminClient
    .from("product_images")
    .select("id", { count: "exact", head: true });
  assert(imgCount === 42, `Clean baseline: exactly 42 product images (got ${imgCount})`);

  console.log("\n==================================================");
  console.log(`Assertions Passed: ${passed}`);
  console.log(`Assertions Failed: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 ALL PHASE 8 MEDIA SECURITY CHECKS PASSED!");
  }
}

runMediaSecurityVerification().catch((err) => {
  console.error("Fatal security verification failure:", err);
  process.exit(1);
});
