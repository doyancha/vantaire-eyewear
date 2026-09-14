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

  // Clean any residual test fixtures from interrupted runs
  await (adminClient.from("products") as any).delete().like("slug", "phase8-%");

  // ---------------------------------------------------------------------------
  // [1/6] Establishing Authenticated Security Test Contexts
  // ---------------------------------------------------------------------------
  console.log("\n[1/6] Establishing Authenticated Security Test Contexts (Owner, Admin, Outsider)...");
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

  const ownerId = await ensureUser("owner@vantaire.local", "owner");
  const adminId = await ensureUser("admin@vantaire.local", "admin");
  const outsiderId = await ensureUser("outsider@vantaire.local");

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: ownerAuth } = await authClient.auth.signInWithPassword({
    email: "owner@vantaire.local",
    password: runtimeSecret,
  });
  const ownerJwt = ownerAuth.session?.access_token!;
  assert(Boolean(ownerJwt), "Owner JWT acquired");

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

  // Create an isolated temporary INACTIVE product fixture for non-masked negative tests
  const testInactiveSlug = `phase8-neg-prod-${Date.now()}`;
  const { data: tempInactiveProd, error: tempProdErr } = await (adminClient.from("products") as any)
    .insert({
      slug: testInactiveSlug,
      name: "Phase 8 Negative Control Product",
      short_name: "Negative Control",
      category: "Sunglasses",
      gender: "Unisex",
      price: 3500,
      currency: "BDT",
      currency_symbol: "৳",
      description: "Temporary inactive product to isolate RLS testing from primary integrity triggers",
      short_description: "Negative control teaser",
      frame_shape: "Round",
      frame_look: "Metal",
      frame_color: "Gold",
      lens_color: "Green",
      lens_type: "Polarized-Style Tint",
      style_category: "Classic",
      fit: "Universal",
      features: ["Control Feature"],
      seo_title: "Negative Control Title",
      seo_description: "Negative control description",
      is_active: false,
    })
    .select()
    .single();

  if (tempProdErr || !tempInactiveProd) throw tempProdErr;

  // Insert a valid image row for this inactive product using controlled service role
  const tempImageId = crypto.randomUUID();
  const tempValidStoragePath = `products/${tempInactiveProd.slug}/image-1111111111111111.jpg`;
  const { error: tempImgErr } = await adminClient.from("product_images").insert({
    id: tempImageId,
    product_id: tempInactiveProd.id,
    storage_path: tempValidStoragePath,
    alt_text: "Valid control image alt text",
    is_primary: false,
    sort_order: 0,
  });
  if (tempImgErr) throw tempImgErr;

  // Retrieve an active product from the catalog for insert RLS controls (so trigger path validation passes and RLS is verified)
  const { data: sampleActiveProd, error: sampleProdErr } = await adminClient
    .from("products")
    .select("id, slug")
    .eq("is_active", true)
    .limit(1)
    .single();
  if (sampleProdErr || !sampleActiveProd) throw sampleProdErr;

  // ---------------------------------------------------------------------------
  // [2/6] Anonymous Context RLS Guards & RPC Denials (Schema-Valid Controls)
  // ---------------------------------------------------------------------------
  console.log("\n[2/6] Verifying Anonymous Context RLS Guards & RPC Denials...");

  // Anonymous: INSERT with fully valid metadata (valid path, valid alt, valid active product)
  const anonValidPath = `products/${sampleActiveProd.slug}/image-aaaaaaaaaaaaaaaa.jpg`;
  const anonInsert = await callPostgrest("product_images", "POST", undefined, {
    product_id: sampleActiveProd.id,
    storage_path: anonValidPath,
    alt_text: "Anonymous injection with valid metadata",
    is_primary: false,
    sort_order: 1,
  });
  if (!(anonInsert.status >= 400 && (anonInsert.data?.message?.includes("row-level security") || anonInsert.data?.code === "42501"))) {
    console.error("anonInsert debug:", anonInsert.status, anonInsert.data);
  }
  assert(
    anonInsert.status >= 400 &&
      (anonInsert.data?.message?.includes("row-level security") || anonInsert.data?.code === "42501"),
    "Anonymous: product_images INSERT rejected strictly by RLS (not path-format trigger)"
  );

  // Anonymous: UPDATE alt_text on valid existing row
  const anonUpdate = await callPostgrest(
    `product_images?id=eq.${tempImageId}`,
    "PATCH",
    undefined,
    { alt_text: "Anonymous alt text mutation attempt" }
  );
  assert(
    anonUpdate.status >= 400 || (Array.isArray(anonUpdate.data) && anonUpdate.data.length === 0),
    "Anonymous: product_images UPDATE rejected strictly by RLS (0 rows modified)"
  );

  // Anonymous: DELETE on valid existing row of INACTIVE product (not masked by active-primary trigger)
  const anonDelete = await callPostgrest(
    `product_images?id=eq.${tempImageId}`,
    "DELETE",
    undefined
  );
  assert(
    anonDelete.status >= 400 || (Array.isArray(anonDelete.data) && anonDelete.data.length === 0),
    "Anonymous: product_images DELETE rejected strictly by RLS (not masked by active-primary trigger)"
  );

  // Anonymous: RPC calls
  const anonRpc1 = await callRpc("set_product_primary_image", undefined, {
    p_product_id: tempInactiveProd.id,
    p_image_id: tempImageId,
  });
  assert(anonRpc1.status >= 400, "Anonymous: RPC set_product_primary_image strictly blocked");

  const anonRpc2 = await callRpc("reorder_product_images", undefined, {
    p_product_id: tempInactiveProd.id,
    p_image_ids: [tempImageId],
  });
  assert(anonRpc2.status >= 400, "Anonymous: RPC reorder_product_images strictly blocked");

  const anonRpc3 = await callRpc("remove_product_image_metadata", undefined, {
    p_product_id: tempInactiveProd.id,
    p_image_id: tempImageId,
  });
  assert(anonRpc3.status >= 400, "Anonymous: RPC remove_product_image_metadata strictly blocked");

  // ---------------------------------------------------------------------------
  // [3/6] Authenticated Outsider Context RLS Guards & RPC Denials (Schema-Valid Controls)
  // ---------------------------------------------------------------------------
  console.log("\n[3/6] Verifying Authenticated Outsider Context RLS Guards & RPC Denials...");

  const outsiderValidPath = `products/${sampleActiveProd.slug}/image-bbbbbbbbbbbbbbbb.jpg`;
  const outsiderInsert = await callPostgrest("product_images", "POST", outsiderJwt, {
    product_id: sampleActiveProd.id,
    storage_path: outsiderValidPath,
    alt_text: "Outsider injection with valid metadata",
    is_primary: false,
    sort_order: 1,
  });
  if (!(outsiderInsert.status >= 400 && (outsiderInsert.data?.message?.includes("row-level security") || outsiderInsert.data?.code === "42501"))) {
    console.error("outsiderInsert debug:", outsiderInsert.status, outsiderInsert.data);
  }
  assert(
    outsiderInsert.status >= 400 &&
      (outsiderInsert.data?.message?.includes("row-level security") || outsiderInsert.data?.code === "42501"),
    "Outsider: product_images INSERT rejected strictly by RLS (not path-format trigger)"
  );

  const outsiderUpdate = await callPostgrest(
    `product_images?id=eq.${tempImageId}`,
    "PATCH",
    outsiderJwt,
    { alt_text: "Outsider alt text mutation attempt" }
  );
  assert(
    outsiderUpdate.status >= 400 || (Array.isArray(outsiderUpdate.data) && outsiderUpdate.data.length === 0),
    "Outsider: product_images UPDATE rejected strictly by RLS (0 rows modified)"
  );

  const outsiderDelete = await callPostgrest(
    `product_images?id=eq.${tempImageId}`,
    "DELETE",
    outsiderJwt
  );
  assert(
    outsiderDelete.status >= 400 || (Array.isArray(outsiderDelete.data) && outsiderDelete.data.length === 0),
    "Outsider: product_images DELETE rejected strictly by RLS (not masked by active-primary trigger)"
  );

  const outsiderRpc1 = await callRpc("set_product_primary_image", outsiderJwt, {
    p_product_id: tempInactiveProd.id,
    p_image_id: tempImageId,
  });
  assert(
    outsiderRpc1.status >= 400 &&
      (outsiderRpc1.data?.message?.includes("insufficient_privilege") || outsiderRpc1.data?.message?.includes("Access denied")),
    "Outsider: RPC set_product_primary_image rejected with insufficient_privilege"
  );

  const outsiderRpc2 = await callRpc("reorder_product_images", outsiderJwt, {
    p_product_id: tempInactiveProd.id,
    p_image_ids: [tempImageId],
  });
  assert(
    outsiderRpc2.status >= 400 &&
      (outsiderRpc2.data?.message?.includes("insufficient_privilege") || outsiderRpc2.data?.message?.includes("Access denied")),
    "Outsider: RPC reorder_product_images rejected with insufficient_privilege"
  );

  const outsiderRpc3 = await callRpc("remove_product_image_metadata", outsiderJwt, {
    p_product_id: tempInactiveProd.id,
    p_image_id: tempImageId,
  });
  assert(
    outsiderRpc3.status >= 400 &&
      (outsiderRpc3.data?.message?.includes("insufficient_privilege") || outsiderRpc3.data?.message?.includes("Access denied")),
    "Outsider: RPC remove_product_image_metadata rejected with insufficient_privilege"
  );

  // Clean up the temporary negative control product
  await adminClient.from("product_images").delete().eq("product_id", tempInactiveProd.id);
  await (adminClient.from("products") as any).delete().eq("id", tempInactiveProd.id);

  // ---------------------------------------------------------------------------
  // [4/6] Active Product Direct Insert RLS Policy (Admin & Owner)
  // ---------------------------------------------------------------------------
  console.log("\n[4/6] Verifying Active Product Direct Insert Policy with Schema-Valid Controls...");

  const baseSchemaValidProduct = {
    category: "Sunglasses",
    gender: "Unisex",
    price: 3600,
    currency: "BDT",
    currency_symbol: "৳",
    description: "Fully valid description satisfying all non-null and domain check constraints.",
    short_description: "Valid teaser teaser teaser",
    frame_shape: "Aviator",
    frame_look: "Metal",
    frame_color: "Gold",
    lens_color: "Green",
    lens_type: "Polarized-Style Tint",
    style_category: "Classic",
    fit: "Universal",
    features: ["Valid Bullet 1", "Valid Bullet 2"],
    seo_title: "Valid SEO Title",
    seo_description: "Valid SEO Description",
    featured: false,
    best_seller: false,
    new_arrival: false,
    in_stock: true,
  };

  // Admin Direct Insert with is_active = true -> MUST FAIL strictly due to RLS WITH CHECK
  const adminActiveInsert = await callPostgrest("products", "POST", adminJwt, {
    ...baseSchemaValidProduct,
    slug: `phase8-active-admin-${Date.now()}`,
    name: "Admin Active Direct Insert",
    short_name: "Admin Active",
    is_active: true,
  });
  assert(
    adminActiveInsert.status >= 400 &&
      (adminActiveInsert.data?.message?.includes("row-level security") || adminActiveInsert.data?.code === "42501"),
    "Admin: direct active product INSERT blocked strictly by RLS WITH CHECK (is_active = false)"
  );

  // Owner Direct Insert with is_active = true -> MUST FAIL strictly due to RLS WITH CHECK
  const ownerActiveInsert = await callPostgrest("products", "POST", ownerJwt, {
    ...baseSchemaValidProduct,
    slug: `phase8-active-owner-${Date.now()}`,
    name: "Owner Active Direct Insert",
    short_name: "Owner Active",
    is_active: true,
  });
  assert(
    ownerActiveInsert.status >= 400 &&
      (ownerActiveInsert.data?.message?.includes("row-level security") || ownerActiveInsert.data?.code === "42501"),
    "Owner: direct active product INSERT blocked strictly by RLS WITH CHECK (is_active = false)"
  );

  // Owner Direct Insert with is_active = false -> MUST PASS (positive control)
  const ownerDraftSlug = `phase8-draft-owner-${Date.now()}`;
  const ownerDraftInsert = await callPostgrest("products", "POST", ownerJwt, {
    ...baseSchemaValidProduct,
    slug: ownerDraftSlug,
    name: "Owner Draft Product",
    short_name: "Owner Draft",
    is_active: false,
  });
  assert(ownerDraftInsert.status === 201, "Owner: direct inactive draft product INSERT succeeds (201 Created)");
  const ownerDraftProd = ownerDraftInsert.data[0];

  // Clean up owner draft product
  await (adminClient.from("products") as any).delete().eq("id", ownerDraftProd.id);

  // ---------------------------------------------------------------------------
  // [5/6] Owner & Admin Media Control Matrix (Positive Controls)
  // ---------------------------------------------------------------------------
  console.log("\n[5/6] Testing Owner & Admin Media Control Matrix (Positive Controls)...");

  // Create an inactive draft product for matrix testing
  const matrixSlug = `phase8-matrix-prod-${Date.now()}`;
  const matrixCreate = await callPostgrest("products", "POST", adminJwt, {
    ...baseSchemaValidProduct,
    slug: matrixSlug,
    name: "Phase 8 Matrix Product",
    short_name: "Matrix Product",
    is_active: false,
  });
  assert(matrixCreate.status === 201, "Admin: created inactive product for media control matrix");
  const matrixProd = matrixCreate.data[0];

  // 1. Owner valid product_images INSERT -> PASS
  const ownerImgHex = crypto.randomBytes(8).toString("hex");
  const ownerImgPath = `products/${matrixProd.slug}/image-${ownerImgHex}.jpg`;
  const ownerImgIns = await callPostgrest("product_images", "POST", ownerJwt, {
    product_id: matrixProd.id,
    storage_path: ownerImgPath,
    alt_text: "Owner uploaded image presentation",
    is_primary: true,
    sort_order: 0,
  });
  assert(ownerImgIns.status === 201, "Owner: valid product_images INSERT succeeds (201 Created)");
  const ownerImg = ownerImgIns.data[0];

  // 2. Admin valid product_images INSERT (second image) -> PASS
  const adminImgHex = crypto.randomBytes(8).toString("hex");
  const adminImgPath = `products/${matrixProd.slug}/image-${adminImgHex}.jpg`;
  const adminImgIns = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: matrixProd.id,
    storage_path: adminImgPath,
    alt_text: "Admin uploaded image presentation",
    is_primary: false,
    sort_order: 1,
  });
  assert(adminImgIns.status === 201, "Admin: valid product_images INSERT succeeds (201 Created)");
  const adminImg = adminImgIns.data[0];

  // 3. Owner valid alt-text UPDATE -> PASS
  const ownerAltUpdate = await callPostgrest(
    `product_images?id=eq.${ownerImg.id}`,
    "PATCH",
    ownerJwt,
    { alt_text: "Owner updated alt text" }
  );
  assert(ownerAltUpdate.status === 200 && ownerAltUpdate.data.length === 1, "Owner: valid alt-text UPDATE succeeds");

  // 4. Admin valid alt-text UPDATE -> PASS
  const adminAltUpdate = await callPostgrest(
    `product_images?id=eq.${adminImg.id}`,
    "PATCH",
    adminJwt,
    { alt_text: "Admin updated alt text" }
  );
  assert(adminAltUpdate.status === 200 && adminAltUpdate.data.length === 1, "Admin: valid alt-text UPDATE succeeds");

  // 5. Owner RPC set_product_primary_image -> PASS
  const ownerRpcPrimary = await callRpc("set_product_primary_image", ownerJwt, {
    p_product_id: matrixProd.id,
    p_image_id: adminImg.id,
  });
  assert(ownerRpcPrimary.status === 200 || ownerRpcPrimary.status === 204, "Owner: RPC set_product_primary_image succeeds");

  // 6. Admin RPC set_product_primary_image -> PASS
  const adminRpcPrimary = await callRpc("set_product_primary_image", adminJwt, {
    p_product_id: matrixProd.id,
    p_image_id: ownerImg.id,
  });
  if (!(adminRpcPrimary.status === 200 || adminRpcPrimary.status === 204)) {
    console.error("adminRpcPrimary debug:", adminRpcPrimary.status, adminRpcPrimary.data);
  }
  assert(adminRpcPrimary.status === 200 || adminRpcPrimary.status === 204, "Admin: RPC set_product_primary_image succeeds");

  // 7. Owner RPC reorder_product_images -> PASS
  const ownerRpcReorder = await callRpc("reorder_product_images", ownerJwt, {
    p_product_id: matrixProd.id,
    p_image_ids: [adminImg.id, ownerImg.id],
  });
  assert(ownerRpcReorder.status === 200 || ownerRpcReorder.status === 204, "Owner: RPC reorder_product_images succeeds");

  // 8. Admin RPC reorder_product_images -> PASS
  const adminRpcReorder = await callRpc("reorder_product_images", adminJwt, {
    p_product_id: matrixProd.id,
    p_image_ids: [ownerImg.id, adminImg.id],
  });
  assert(adminRpcReorder.status === 200 || adminRpcReorder.status === 204, "Admin: RPC reorder_product_images succeeds");

  // 9. Owner Storage upload & delete
  const ownerStorageClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${ownerJwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const dummyBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01]);
  const ownerStoragePath = `products/${matrixProd.slug}/image-${crypto.randomBytes(8).toString("hex")}.jpg`;
  const { error: ownerStoreUpErr } = await ownerStorageClient.storage
    .from("product-media")
    .upload(ownerStoragePath, dummyBuffer, { contentType: "image/jpeg" });
  assert(!ownerStoreUpErr, "Owner: Storage upload succeeds under RLS");

  const { error: ownerStoreDelErr } = await ownerStorageClient.storage
    .from("product-media")
    .remove([ownerStoragePath]);
  assert(!ownerStoreDelErr, "Owner: Storage delete succeeds under RLS");

  // 10. Owner RPC remove_product_image_metadata on inactive product -> PASS
  const ownerRpcRemove = await callRpc("remove_product_image_metadata", ownerJwt, {
    p_product_id: matrixProd.id,
    p_image_id: adminImg.id,
  });
  assert(ownerRpcRemove.status === 200, "Owner: RPC remove_product_image_metadata succeeds");

  // 11. Admin RPC remove_product_image_metadata on remaining image of inactive product -> PASS
  const adminRpcRemove = await callRpc("remove_product_image_metadata", adminJwt, {
    p_product_id: matrixProd.id,
    p_image_id: ownerImg.id,
  });
  assert(adminRpcRemove.status === 200, "Admin: RPC remove_product_image_metadata succeeds on inactive product");

  // Clean up matrix product
  await (adminClient.from("products") as any).delete().eq("id", matrixProd.id);

  // ---------------------------------------------------------------------------
  // [6/6] Admin Database Triggers & Exact Failure Attribution
  // ---------------------------------------------------------------------------
  console.log("\n[6/6] Testing Database Triggers & Exact Failure Attribution...");

  const guardSlug = `phase8-guard-prod-${Date.now()}`;
  const guardCreate = await callPostgrest("products", "POST", adminJwt, {
    ...baseSchemaValidProduct,
    slug: guardSlug,
    name: "Phase 8 Guard Verification",
    short_name: "Guard Verification",
    is_active: false,
  });
  assert(guardCreate.status === 201, "Admin: created draft product for trigger testing");
  const guardProd = guardCreate.data[0];

  // Trigger 1: Activation Guard with 0 images
  const activate0Images = await callPostgrest(
    `products?id=eq.${guardProd.id}`,
    "PATCH",
    adminJwt,
    { is_active: true }
  );
  assert(
    activate0Images.status >= 400 &&
      (activate0Images.data?.message?.includes("Cannot activate product without at least one image") ||
       activate0Images.data?.details?.includes("at least one image")),
    "DB Trigger: trg_guard_product_activation blocks activating product with 0 images"
  );

  // Trigger 2: Storage path traversal
  const pathTraversal = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: guardProd.id,
    storage_path: `products/${guardProd.slug}/../evil/image-1234567890abcdef.jpg`,
    alt_text: "Traversal attack",
    is_primary: false,
  });
  assert(
    pathTraversal.status >= 400 && pathTraversal.data?.message?.includes("Invalid storage_path"),
    "DB Trigger: trg_guard_product_image_storage_path blocks path traversal (..)"
  );

  // Trigger 3: Storage path backslash
  const pathBackslash = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: guardProd.id,
    storage_path: `products\\${guardProd.slug}\\image-1234567890abcdef.jpg`,
    alt_text: "Backslash attack",
    is_primary: false,
  });
  assert(
    pathBackslash.status >= 400 && pathBackslash.data?.message?.includes("Invalid storage_path"),
    "DB Trigger: trg_guard_product_image_storage_path blocks backslashes"
  );

  // Trigger 4: Storage path protocol
  const pathProtocol = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: guardProd.id,
    storage_path: `https://evil.com/products/${guardProd.slug}/image-1234567890abcdef.jpg`,
    alt_text: "Protocol attack",
    is_primary: false,
  });
  assert(
    pathProtocol.status >= 400 && pathProtocol.data?.message?.includes("Invalid storage_path"),
    "DB Trigger: trg_guard_product_image_storage_path blocks external URLs (http/https)"
  );

  // Trigger 5: Storage path slug mismatch
  const pathSlugMismatch = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: guardProd.id,
    storage_path: `products/another-slug-hijack/image-1234567890abcdef.jpg`,
    alt_text: "Slug hijack attack",
    is_primary: false,
  });
  assert(
    pathSlugMismatch.status >= 400 && pathSlugMismatch.data?.message?.includes("must start with"),
    "DB Trigger: trg_guard_product_image_storage_path blocks mismatched product slug"
  );

  // Trigger 6: Storage path collections prefix
  const pathCollection = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: guardProd.id,
    storage_path: `collections/aviator/cover-1234567890abcdef.jpg`,
    alt_text: "Collection path hijack",
    is_primary: false,
  });
  assert(
    pathCollection.status >= 400 && pathCollection.data?.message?.includes("Invalid storage_path"),
    "DB Trigger: trg_guard_product_image_storage_path blocks collections/ prefix for product images"
  );

  // Trigger 7: Storage path nested subdirectory
  const pathNested = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: guardProd.id,
    storage_path: `products/${guardProd.slug}/nested/image-1234567890abcdef.jpg`,
    alt_text: "Nested path attack",
    is_primary: false,
  });
  assert(
    pathNested.status >= 400 && pathNested.data?.message?.includes("cannot have nested subdirectories"),
    "DB Trigger: trg_guard_product_image_storage_path blocks nested subdirectories"
  );

  // Trigger 8: Non-hex filename format
  const pathNonHex = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: guardProd.id,
    storage_path: `products/${guardProd.slug}/image-nonhex-filename.jpg`,
    alt_text: "Non-hex filename attack",
    is_primary: false,
  });
  assert(
    pathNonHex.status >= 400 && pathNonHex.data?.message?.includes("filename must match primary-{hex} or image-{hex} format"),
    "DB Trigger: trg_guard_product_image_storage_path blocks non-hex filenames"
  );

  // Insert 5 valid images (Max capacity)
  const imageIds: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const hexHash = crypto.randomBytes(8).toString("hex");
    const ins = await callPostgrest("product_images", "POST", adminJwt, {
      product_id: guardProd.id,
      storage_path: `products/${guardProd.slug}/image-${hexHash}.jpg`,
      alt_text: `Valid image ${i}`,
      is_primary: i === 1,
      sort_order: i - 1,
    });
    assert(ins.status === 201, `Admin: uploaded valid image ${i}/5`);
    imageIds.push(ins.data[0].id);
  }

  // Trigger 9: 6th image over-limit
  const hex6 = crypto.randomBytes(8).toString("hex");
  const ins6 = await callPostgrest("product_images", "POST", adminJwt, {
    product_id: guardProd.id,
    storage_path: `products/${guardProd.slug}/image-${hex6}.jpg`,
    alt_text: "Image 6 over-limit attempt",
    is_primary: false,
    sort_order: 5,
  });
  assert(
    ins6.status >= 400 && ins6.data?.message?.includes("cannot have more than 5 images"),
    "DB Trigger: trg_guard_product_images_max_limit strictly blocks 6th image"
  );

  // Activate the product (now has 5 images and 1 primary) -> MUST SUCCEED
  const activateSuccess = await callPostgrest(
    `products?id=eq.${guardProd.id}`,
    "PATCH",
    adminJwt,
    { is_active: true }
  );
  assert(
    activateSuccess.status === 200 && activateSuccess.data[0]?.is_active === true,
    "Product activation succeeds when exactly 1 primary image exists"
  );

  // Remove 4 images
  for (let i = 1; i < imageIds.length; i++) {
    await callRpc("remove_product_image_metadata", adminJwt, {
      p_product_id: guardProd.id,
      p_image_id: imageIds[i],
    });
  }

  // Trigger 10: Attempt to remove the 1 remaining image of an ACTIVE product
  const removeSoleImage = await callRpc("remove_product_image_metadata", adminJwt, {
    p_product_id: guardProd.id,
    p_image_id: imageIds[0],
  });
  assert(
    removeSoleImage.status >= 400 &&
      removeSoleImage.data?.message?.includes("Cannot remove the only image of an active product"),
    "RPC Guard: remove_product_image_metadata blocks deleting sole image of active product"
  );

  // ---------------------------------------------------------------------------
  // Final Cleanup & Baseline Verification
  // ---------------------------------------------------------------------------
  console.log("\n[Cleanup] Cleaning Up Fixtures & Verifying Clean Baseline...");

  await adminClient.from("products").update({ is_active: false }).eq("id", guardProd.id);
  await adminClient.from("product_images").delete().eq("product_id", guardProd.id);
  await (adminClient.from("products") as any).delete().eq("id", guardProd.id);
  await (adminClient.from("products") as any).delete().like("slug", "phase8-%");

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
