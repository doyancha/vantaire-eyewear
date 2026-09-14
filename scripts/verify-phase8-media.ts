import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../src/types/database.types";
import {
  sniffImageMagicBytes,
  validateImageUpload,
  buildProductStoragePath,
  validateAltText,
  MAX_IMAGE_FILE_SIZE,
} from "../src/lib/admin/media-validation";

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

async function runMediaVerification() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 8 PRODUCT MEDIA VERIFICATION");
  console.log("==================================================");

  const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ---------------------------------------------------------------------------
  // [1/6] Unit Verification: Magic Byte Sniffing & Input Validation
  // ---------------------------------------------------------------------------
  console.log("\n[1/6] Verifying Image Magic Byte Sniffing & Format Validation...");

  // JPEG Header: FF D8 FF
  const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01]);
  const jpegSniff = sniffImageMagicBytes(fakeJpeg);
  assert(jpegSniff?.mimeType === "image/jpeg" && jpegSniff?.extension === "jpg", "Magic bytes: JPEG detected accurately");

  // PNG Header: 89 50 4E 47 0D 0A 1A 0A
  const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const pngSniff = sniffImageMagicBytes(fakePng);
  assert(pngSniff?.mimeType === "image/png" && pngSniff?.extension === "png", "Magic bytes: PNG detected accurately");

  // WebP Header: RIFF....WEBP
  const fakeWebp = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x24, 0x00, 0x00, 0x00, // size
    0x57, 0x45, 0x42, 0x50, // WEBP
    0x56, 0x50, 0x38, 0x20, // VP8
  ]);
  const webpSniff = sniffImageMagicBytes(fakeWebp);
  assert(webpSniff?.mimeType === "image/webp" && webpSniff?.extension === "webp", "Magic bytes: WebP detected accurately");

  // Spoofed text file pretending to be image/jpeg
  const textBuffer = Buffer.from("Hello world, this is a plain text file pretending to be an image.");
  const spoofVal = validateImageUpload(textBuffer, "image/jpeg");
  assert(!spoofVal.success && spoofVal.error.includes("Invalid image file format"), "Validation: rejects text file spoofing image/jpeg");

  // MIME type mismatch
  const mismatchVal = validateImageUpload(fakePng, "image/jpeg");
  assert(!mismatchVal.success && mismatchVal.error.includes("MIME type mismatch"), "Validation: rejects declared MIME mismatch (PNG file declared as JPEG)");

  // Oversized file check
  const oversizedBuffer = Buffer.alloc(MAX_IMAGE_FILE_SIZE + 1024);
  const oversizedVal = validateImageUpload(oversizedBuffer);
  assert(!oversizedVal.success && oversizedVal.error.includes("exceeds maximum permitted 5 MB"), "Validation: rejects buffer exceeding 5 MB");

  // Alt text validation
  const emptyAlt = validateAltText("");
  assert(!emptyAlt.success, "Alt text: rejects empty alt text");

  const shortAlt = validateAltText("a");
  assert(!shortAlt.success, "Alt text: rejects alt text shorter than 2 chars");

  const longAlt = validateAltText("a".repeat(201));
  assert(!longAlt.success, "Alt text: rejects alt text longer than 200 chars");

  const validAlt = validateAltText("   Matte black sunglasses front view   ");
  assert(validAlt.success && validAlt.value === "Matte black sunglasses front view", "Alt text: normalizes and accepts valid alt text");

  // Content-addressed path builder
  const canonPath = buildProductStoragePath("Apex Stealth", "e1492270eead15fd", "jpg");
  assert(canonPath === "products/apex-stealth/image-e1492270eead15fd.jpg", "Path Builder: produces canonical content-addressed storage path");

  // ---------------------------------------------------------------------------
  // [2/6] Setup Authenticated Admin Session
  // ---------------------------------------------------------------------------
  console.log("\n[2/6] Authenticating Admin Session...");
  const runtimeSecret = crypto.randomBytes(16).toString("hex") + "!Aa1";

  const { data: listData } = await adminClient.auth.admin.listUsers();
  let adminUser = listData?.users.find((u) => u.email === "admin@vantaire.local");
  if (!adminUser) {
    const { data: created } = await adminClient.auth.admin.createUser({
      email: "admin@vantaire.local",
      password: runtimeSecret,
      email_confirm: true,
    });
    adminUser = created.user!;
  } else {
    await adminClient.auth.admin.updateUserById(adminUser.id, { password: runtimeSecret });
  }

  await (adminClient.from("admin_profiles") as any).upsert({
    id: adminUser.id,
    role: "admin",
    display_name: "Admin User",
  });

  const authClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData } = await authClient.auth.signInWithPassword({
    email: "admin@vantaire.local",
    password: runtimeSecret,
  });
  const adminClientAuth = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${authData.session?.access_token}`,
      },
    },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  assert(Boolean(authData.session?.access_token), "Authenticated Admin client established");

  // ---------------------------------------------------------------------------
  // [3/6] Multi-Image Lifecycle: Upload, Initial Primary, Secondary, Primary Promotion
  // ---------------------------------------------------------------------------
  console.log("\n[3/6] Testing Multi-Image Lifecycle & Atomic RPCs...");

  // Create test draft product
  const testSlug = `phase8-lifecycle-${Date.now()}`;
  const { data: createdProd, error: prodErr } = await adminClientAuth
    .from("products")
    .insert({
      slug: testSlug,
      name: "Phase 8 Lifecycle Test",
      short_name: "Lifecycle Test",
      category: "Sunglasses",
      gender: "Unisex",
      price: 3800,
      currency: "BDT",
      currency_symbol: "৳",
      description: "Testing multi-image lifecycle workflows",
      short_description: "Lifecycle test teaser",
      frame_shape: "Square",
      frame_look: "Acetate",
      frame_color: "Jet Black",
      lens_color: "Grey",
      lens_type: "Polarized-Style Tint",
      style_category: "Contemporary",
      fit: "Medium",
      features: ["Handcrafted acetate", "Anti-reflective coating"],
      seo_title: "Phase 8 Lifecycle Test",
      seo_description: "Phase 8 test item",
      is_active: false,
    })
    .select()
    .single();

  if (prodErr || !createdProd) throw prodErr;
  assert(Boolean(createdProd.id), "Created draft product for media lifecycle testing");

  // Load a genuine test image from public/images/products
  const sampleLocalSource = path.resolve(process.cwd(), "public/images/products/noir-sovereign-aviator.jpg");
  const sampleBytes = fs.readFileSync(sampleLocalSource);
  const hash1 = crypto.randomBytes(8).toString("hex");
  const hash2 = crypto.randomBytes(8).toString("hex");
  const hash3 = crypto.randomBytes(8).toString("hex");

  // Upload Image 1 to Supabase Storage
  const path1 = `products/${createdProd.slug}/image-${hash1}.jpg`;
  const { error: up1Err } = await adminClientAuth.storage
    .from("product-media")
    .upload(path1, sampleBytes, { contentType: "image/jpeg", cacheControl: "31536000", upsert: true });
  assert(!up1Err, "Storage: uploaded test image 1");

  // Record Image 1 in DB as initial primary
  const { data: img1, error: db1Err } = await adminClientAuth
    .from("product_images")
    .insert({
      product_id: createdProd.id,
      storage_path: path1,
      alt_text: "Presentation 1 initial primary",
      is_primary: true,
      sort_order: 0,
    })
    .select()
    .single();
  if (db1Err) console.error("db1Err:", db1Err);
  assert(!db1Err && img1?.is_primary === true, "Database: recorded Image 1 as initial primary");

  // Upload Image 2
  const path2 = `products/${createdProd.slug}/image-${hash2}.jpg`;
  await adminClientAuth.storage
    .from("product-media")
    .upload(path2, sampleBytes, { contentType: "image/jpeg", cacheControl: "31536000", upsert: true });

  const { data: img2, error: db2Err } = await adminClientAuth
    .from("product_images")
    .insert({
      product_id: createdProd.id,
      storage_path: path2,
      alt_text: "Presentation 2 secondary",
      is_primary: false,
      sort_order: 1,
    })
    .select()
    .single();
  if (db2Err) console.error("db2Err:", db2Err);
  assert(!db2Err && img2?.is_primary === false, "Database: recorded Image 2 as secondary (is_primary = false)");

  // Upload Image 3
  const path3 = `products/${createdProd.slug}/image-${hash3}.jpg`;
  await adminClientAuth.storage
    .from("product-media")
    .upload(path3, sampleBytes, { contentType: "image/jpeg", cacheControl: "31536000", upsert: true });

  const { data: img3, error: db3Err } = await adminClientAuth
    .from("product_images")
    .insert({
      product_id: createdProd.id,
      storage_path: path3,
      alt_text: "Presentation 3 secondary",
      is_primary: false,
      sort_order: 2,
    })
    .select()
    .single();
  if (db3Err) console.error("db3Err:", db3Err);
  assert(!db3Err && img3?.is_primary === false, "Database: recorded Image 3");

  if (!img1 || !img2 || !img3) throw new Error("Image insertion failed");

  // Test RPC: set_product_primary_image to promote Image 2 to primary
  const { error: rpcSetPrimaryErr } = await adminClientAuth.rpc("set_product_primary_image", {
    p_product_id: createdProd.id,
    p_image_id: img2.id,
  });
  assert(!rpcSetPrimaryErr, "RPC: set_product_primary_image executed successfully");

  // Verify DB state: Image 2 is primary, Image 1 is non-primary
  const { data: verifiedImages } = await adminClientAuth
    .from("product_images")
    .select("id, is_primary")
    .eq("product_id", createdProd.id);

  const img1After = verifiedImages?.find((i) => i.id === img1.id);
  const img2After = verifiedImages?.find((i) => i.id === img2.id);
  assert(img2After?.is_primary === true && img1After?.is_primary === false, "Atomic Primary Toggle: Image 2 became primary, Image 1 demoted to non-primary");

  // Test RPC: reorder_product_images (swap order: [img3, img2, img1])
  const { error: reorderErr } = await adminClientAuth.rpc("reorder_product_images", {
    p_product_id: createdProd.id,
    p_image_ids: [img3.id, img2.id, img1.id],
  });
  assert(!reorderErr, "RPC: reorder_product_images executed successfully");

  const { data: reorderedImages } = await adminClientAuth
    .from("product_images")
    .select("id, sort_order")
    .eq("product_id", createdProd.id)
    .order("sort_order", { ascending: true });

  assert(
    reorderedImages?.[0]?.id === img3.id &&
    reorderedImages?.[1]?.id === img2.id &&
    reorderedImages?.[2]?.id === img1.id,
    "Reorder: images updated accurately to [img3 (order 0), img2 (order 1), img1 (order 2)]"
  );

  // ---------------------------------------------------------------------------
  // [4/6] Image Replacement, Deletion, and Storage Cleanup
  // ---------------------------------------------------------------------------
  console.log("\n[4/6] Testing Image Replace, Removal, and Storage Synchronization...");

  // Replace Image 3 with a new storage file
  const replaceHash = crypto.randomBytes(8).toString("hex");
  const path3Replacement = `products/${createdProd.slug}/image-${replaceHash}.jpg`;
  await adminClientAuth.storage
    .from("product-media")
    .upload(path3Replacement, sampleBytes, { contentType: "image/jpeg", cacheControl: "31536000", upsert: true });

  // Update DB metadata for Image 3
  const { error: replaceDbErr } = await adminClientAuth
    .from("product_images")
    .update({ storage_path: path3Replacement, alt_text: "Updated presentation 3 replaced" })
    .eq("id", img3.id);
  assert(!replaceDbErr, "Replace: DB metadata updated with new storage_path");

  // Delete old storage object path3
  const { error: delOldErr } = await adminClientAuth.storage.from("product-media").remove([path3]);
  assert(!delOldErr, "Replace: old unreferenced storage object deleted from bucket");

  // Verify old path no longer exists in Storage
  const { data: oldDownload } = await adminClientAuth.storage.from("product-media").download(path3);
  assert(!oldDownload, "Replace: verified old storage object is completely gone");

  // Remove Image 1 using RPC remove_product_image_metadata
  const { data: remData, error: remErr } = await adminClientAuth.rpc("remove_product_image_metadata", {
    p_product_id: createdProd.id,
    p_image_id: img1.id,
  });
  assert(!remErr && remData?.[0]?.deleted_storage_path === path1, "RPC: remove_product_image_metadata deleted metadata and returned deleted_storage_path");

  // Delete storage file path1
  await adminClientAuth.storage.from("product-media").remove([path1]);
  const { data: path1Download } = await adminClientAuth.storage.from("product-media").download(path1);
  assert(!path1Download, "Removal: verified removed image storage object is deleted from bucket");

  // ---------------------------------------------------------------------------
  // [5/6] Orphan Detection and Cleanup Verification
  // ---------------------------------------------------------------------------
  console.log("\n[5/6] Testing Orphan Detection & Cleanup...");

  // Create an unreferenced file in this product's storage folder
  const orphanPath = `products/${createdProd.slug}/image-orphan-garbage-999.jpg`;
  await adminClientAuth.storage
    .from("product-media")
    .upload(orphanPath, sampleBytes, { contentType: "image/jpeg", upsert: true });

  // List files in folder products/{slug}
  const { data: folderFiles } = await adminClientAuth.storage
    .from("product-media")
    .list(`products/${createdProd.slug}`);

  const { data: dbImages } = await adminClientAuth
    .from("product_images")
    .select("storage_path")
    .eq("product_id", createdProd.id);

  const dbPathSet = new Set(dbImages?.map((i) => i.storage_path));
  const orphans = folderFiles?.filter((f) => !dbPathSet.has(`products/${createdProd.slug}/${f.name}`)) || [];
  assert(orphans.length === 1 && orphans[0].name === "image-orphan-garbage-999.jpg", "Orphan Detection: identified unreferenced file in product folder");

  // Clean up orphan file
  const { error: cleanErr } = await adminClientAuth.storage.from("product-media").remove([orphanPath]);
  assert(!cleanErr, "Orphan Cleanup: successfully removed unreferenced file");

  // ---------------------------------------------------------------------------
  // [6/6] Cleanup Test Fixtures & Baseline Verification
  // ---------------------------------------------------------------------------
  console.log("\n[6/6] Cleaning Up Test Fixtures & Restoring Catalog Baseline...");

  // Clean up remaining test storage objects
  await adminClientAuth.storage.from("product-media").remove([path2, path3Replacement]);

  // Clean up any residual storage test objects
  const { data: rootFolders } = await adminClient.storage.from("product-media").list("products", { limit: 100 });
  const testFolders = (rootFolders || []).filter((r) => r.name.startsWith("phase8-"));
  for (const f of testFolders) {
    const { data: files } = await adminClient.storage.from("product-media").list(`products/${f.name}`);
    const filePaths = (files || []).map((file) => `products/${f.name}/${file.name}`);
    if (filePaths.length > 0) {
      await adminClient.storage.from("product-media").remove(filePaths);
    }
  }

  // Clean up DB records
  await adminClient.from("product_images").delete().eq("product_id", createdProd.id);
  await (adminClient.from("products") as any).delete().eq("id", createdProd.id);
  // Also clean any orphaned test products from interrupted runs
  await (adminClient.from("products") as any).delete().like("slug", "phase8-%");

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

  const { count: primaryCount } = await adminClient
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("is_primary", true);
  assert(primaryCount === 42, `Clean baseline: exactly 42 primary images (got ${primaryCount})`);

  console.log("\n==================================================");
  console.log(`Assertions Passed: ${passed}`);
  console.log(`Assertions Failed: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 ALL 24 PHASE 8 PRODUCT MEDIA VERIFICATION CHECKS PASSED!");
  }
}

runMediaVerification().catch((err) => {
  console.error("Fatal media verification failure:", err);
  process.exit(1);
});
