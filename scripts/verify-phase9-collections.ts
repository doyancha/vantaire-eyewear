import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../src/types/database.types";
import {
  validateImageUpload,
  buildCollectionCoverStoragePath,
} from "../src/lib/admin/media-validation";
import {
  createCollectionSchema,
  updateCollectionSchema,
  COLLECTION_SLUG_REGEX,
} from "../src/lib/admin/collection-validation";

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
  throw new Error("Required Supabase keys missing in environment.");
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

// Construct minimal valid image buffers for testing
function makeJpegBuffer(): Buffer {
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xd9,
  ]);
}

function makePngBuffer(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
  ]);
}

function makeWebpBuffer(): Buffer {
  return Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x4c, 0x0d, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00,
    0x00, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
}

async function runCollectionVerification() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 9 COLLECTION VERIFICATION");
  console.log("==================================================");

  const adminClient = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const anonClient = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Pre-cleanup of any previous test fixtures
  await (adminClient.from("collections") as any).delete().like("slug", "phase9-%");
  const { data: testObjects } = await adminClient.storage.from("product-media").list("collections");
  const phase9Folders = (testObjects || []).filter((f) => f.name.startsWith("phase9-"));
  for (const folder of phase9Folders) {
    const { data: innerFiles } = await adminClient.storage.from("product-media").list(`collections/${folder.name}`);
    if (innerFiles && innerFiles.length > 0) {
      await adminClient.storage.from("product-media").remove(innerFiles.map((f) => `collections/${folder.name}/${f.name}`));
    }
  }

  // ---------------------------------------------------------------------------
  // [1/7] Zod Validation & Domain Rules
  // ---------------------------------------------------------------------------
  console.log("\n[1/7] Testing Zod Validation & Domain Model Rules...");
  {
    // Valid collection payload
    const validCreate = createCollectionSchema.safeParse({
      name: "The Vanguard Aviator",
      slug: "the-vanguard-aviator",
      tagline: "Bold High-Altitude Flight Contour",
      description: "Handcrafted titanium frame sculpted for presence and optical clarity.",
    });
    assert(validCreate.success, "Zod accepts valid collection creation payload");

    // Invalid slug regex (uppercase, spaces, special chars)
    const invalidSlug = createCollectionSchema.safeParse({
      name: "Invalid Collection",
      slug: "Invalid_Slug 123",
      tagline: "Tagline",
      description: "Description",
    });
    assert(!invalidSlug.success, "Zod rejects invalid slug format (uppercase, underscores, spaces)");

    // Empty fields
    const emptyDesc = createCollectionSchema.safeParse({
      name: "Test",
      slug: "test-slug",
      tagline: "Tagline",
      description: "   ",
    });
    assert(!emptyDesc.success, "Zod rejects whitespace-only description");

    // Slug regex pattern validation
    assert(COLLECTION_SLUG_REGEX.test("the-verona-cat-eye"), "COLLECTION_SLUG_REGEX validates canonical slug");
    assert(!COLLECTION_SLUG_REGEX.test("The-Verona"), "COLLECTION_SLUG_REGEX rejects uppercase letters");
    assert(!COLLECTION_SLUG_REGEX.test("verona--cat"), "COLLECTION_SLUG_REGEX rejects double hyphens");
    assert(!COLLECTION_SLUG_REGEX.test("-verona"), "COLLECTION_SLUG_REGEX rejects leading hyphen");
  }

  // ---------------------------------------------------------------------------
  // [2/7] Cover Image Format, Signature & Content-Addressing Validation
  // ---------------------------------------------------------------------------
  console.log("\n[2/7] Testing Cover Magic Bytes & Content-Addressed Paths...");
  {
    const jpegBuf = makeJpegBuffer();
    const pngBuf = makePngBuffer();
    const webpBuf = makeWebpBuffer();

    const jpegRes = validateImageUpload(jpegBuf, "image/jpeg");
    assert(jpegRes.success && jpegRes.info.extension === "jpg", "Validates genuine JPEG binary");

    const pngRes = validateImageUpload(pngBuf, "image/png");
    assert(pngRes.success && pngRes.info.extension === "png", "Validates genuine PNG binary");

    const webpRes = validateImageUpload(webpBuf, "image/webp");
    assert(webpRes.success && webpRes.info.extension === "webp", "Validates genuine WebP binary");

    // Spoofed text file
    const fakeJpg = Buffer.from("NOT AN IMAGE JUST TEXT FOR SPOOFING TEST");
    const spoofRes = validateImageUpload(fakeJpg, "image/jpeg");
    assert(!spoofRes.success, "Strictly rejects text file spoofing image/jpeg");

    // MIME mismatch
    const mismatchRes = validateImageUpload(pngBuf, "image/jpeg");
    assert(!mismatchRes.success, "Strictly rejects declared MIME mismatch (PNG file sent as JPEG)");

    // Oversized buffer
    const bigBuf = Buffer.alloc(5 * 1024 * 1024 + 10);
    const bigRes = validateImageUpload(bigBuf, "image/jpeg");
    assert(!bigRes.success, "Strictly rejects buffer exceeding 5 MB limit");

    // Path builder
    const coverPath = buildCollectionCoverStoragePath("the-verona-cat-eye", "abcdef1234567890", "webp");
    assert(
      coverPath === "collections/the-verona-cat-eye/cover-abcdef1234567890.webp",
      "Path builder produces canonical content-addressed storage path"
    );
  }

  // ---------------------------------------------------------------------------
  // Authenticate Admin Client
  // ---------------------------------------------------------------------------
  const runtimeSecret = crypto.randomBytes(16).toString("hex") + "!Aa1";
  const { data: usersList } = await adminClient.auth.admin.listUsers();
  let adminUser = usersList?.users.find((u) => u.email === "admin@vantaire.local");
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
  // [3/7] Draft Collection Creation & Public Isolation
  // ---------------------------------------------------------------------------
  console.log("\n[3/7] Testing Draft Collection Creation & Storefront Isolation...");
  const testSlug = `phase9-test-${Date.now()}`;
  let testCollectionId: string = "";
  let currentUpdatedAt: string = "";

  {
    // Insert new inactive draft collection using authenticated admin
    const { data: draft, error: createErr } = await adminClientAuth
      .from("collections")
      .insert({
        name: "Phase 9 Test Silhouette",
        slug: testSlug,
        tagline: "Autonomous Verification Collection",
        description: "Temporary draft collection to verify Phase 9 data integrity.",
        cover_image: null,
        is_active: false,
        sort_order: 99,
      })
      .select()
      .single();

    assert(!createErr && !!draft, "Successfully inserted inactive draft collection with NULL cover_image");
    if (!draft) throw new Error("Draft insertion failed");
    testCollectionId = draft.id;
    currentUpdatedAt = draft.updated_at;

    assert(draft.is_active === false, "Draft collection defaults to is_active = false");
    assert(draft.cover_image === null, "Draft collection permits NULL cover_image");

    // Storefront public read verification: Anonymous user CANNOT see inactive collection
    const { data: publicCol, error: pubErr } = await anonClient
      .from("collections")
      .select("*")
      .eq("slug", testSlug)
      .maybeSingle();

    assert(!pubErr && publicCol === null, "Storefront isolation: Inactive draft is invisible to public/anon (404)");
  }

  // ---------------------------------------------------------------------------
  // [4/7] Cover Upload, Replace, HTTP Verification & Storage Synchronization
  // ---------------------------------------------------------------------------
  console.log("\n[4/7] Testing Cover Upload, Verification & Old Object Cleanup...");
  let uploadedCoverPath: string = "";
  {
    const webpBuf = makeWebpBuffer();
    const sha256Hex = crypto.createHash("sha256").update(webpBuf).digest("hex");
    const prefix16 = sha256Hex.slice(0, 16);
    uploadedCoverPath = buildCollectionCoverStoragePath(testSlug, prefix16, "webp");

    // Upload to product-media bucket
    const { error: upErr } = await adminClient.storage
      .from("product-media")
      .upload(uploadedCoverPath, webpBuf, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });
    assert(!upErr, "Uploaded content-addressed collection cover to storage");

    // HTTP verification of public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/product-media/${uploadedCoverPath}`;
    const httpRes = await fetch(publicUrl);
    assert(httpRes.status === 200, `Public CDN returns HTTP 200 for uploaded cover (${publicUrl})`);
    const downloadedBuf = Buffer.from(await httpRes.arrayBuffer());
    const downloadedHash = crypto.createHash("sha256").update(downloadedBuf).digest("hex");
    assert(downloadedHash === sha256Hex, "Downloaded cover bytes match uploaded SHA-256 hash");

    // Update DB cover pointer
    const { data: updated, error: updErr } = await (adminClient.from("collections") as any)
      .update({ cover_image: uploadedCoverPath })
      .eq("id", testCollectionId)
      .select()
      .single();

    assert(!updErr && updated?.cover_image === uploadedCoverPath, "Updated collections.cover_image in database");
    currentUpdatedAt = updated.updated_at;

    // Test Cover Replacement
    const pngBuf = makePngBuffer();
    const pngHash = crypto.createHash("sha256").update(pngBuf).digest("hex");
    const newCoverPath = buildCollectionCoverStoragePath(testSlug, pngHash.slice(0, 16), "png");

    await adminClient.storage.from("product-media").upload(newCoverPath, pngBuf, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: true,
    });

    // Update DB pointer first
    const { data: replaced, error: replErr } = await (adminClient.from("collections") as any)
      .update({ cover_image: newCoverPath })
      .eq("id", testCollectionId)
      .select()
      .single();

    assert(!replErr && replaced?.cover_image === newCoverPath, "Replaced collections.cover_image pointer");
    currentUpdatedAt = replaced.updated_at;

    // Delete old storage object
    const { error: delErr } = await adminClient.storage
      .from("product-media")
      .remove([uploadedCoverPath]);
    assert(!delErr, "Deleted old unreferenced cover object from storage");

    // Verify old object is gone
    const oldCheck = await fetch(publicUrl);
    assert(oldCheck.status === 404 || oldCheck.status === 400, "Verified old cover object no longer accessible via CDN");

    uploadedCoverPath = newCoverPath;
  }

  // ---------------------------------------------------------------------------
  // [5/7] Product Membership Assignment, Ordering & Concurrency
  // ---------------------------------------------------------------------------
  console.log("\n[5/7] Testing Product Membership Assignment & Ordering via RPC...");
  {
    // Fetch 3 existing products
    const { data: sampleProducts } = await adminClient
      .from("products")
      .select("id, legacy_id, name")
      .limit(3);

    if (!sampleProducts || sampleProducts.length < 3) {
      throw new Error("Insufficient catalog products found for membership test.");
    }

    const [p0, p1, p2] = sampleProducts.map((p) => p.id);

    // Call RPC set_collection_products with array [p0, p1, p2]
    const { data: rpcRes, error: rpcErr } = await adminClientAuth.rpc("set_collection_products", {
      p_collection_id: testCollectionId,
      p_product_ids: [p0, p1, p2],
      p_expected_updated_at: currentUpdatedAt,
    });

    if (rpcErr) console.error("RPC Error Details:", rpcErr);
    assert(!rpcErr && rpcRes && rpcRes.length > 0, "RPC set_collection_products succeeded");
    if (!rpcRes) return;
    assert(rpcRes?.[0]?.member_count === 3, "RPC recorded exactly 3 assigned products");
    currentUpdatedAt = rpcRes[0].updated_at;

    // Verify positions in product_collections
    const { data: members } = await adminClient
      .from("product_collections")
      .select("product_id, position")
      .eq("collection_id", testCollectionId)
      .order("position", { ascending: true });

    assert(
      members?.[0]?.product_id === p0 && members?.[0]?.position === 0 &&
      members?.[1]?.product_id === p1 && members?.[1]?.position === 1 &&
      members?.[2]?.product_id === p2 && members?.[2]?.position === 2,
      "Product memberships assigned with contiguous zero-indexed positions (0, 1, 2)"
    );

    // Test Atomic Reordering: [p2, p0, p1]
    const { data: reorderRes, error: reorderErr } = await adminClientAuth.rpc("set_collection_products", {
      p_collection_id: testCollectionId,
      p_product_ids: [p2, p0, p1],
      p_expected_updated_at: currentUpdatedAt,
    });

    assert(!reorderErr, "RPC set_collection_products reordered members successfully");
    if (reorderRes?.[0]?.updated_at) {
      currentUpdatedAt = reorderRes[0].updated_at;
    }

    const { data: reorderedMembers } = await adminClient
      .from("product_collections")
      .select("product_id, position")
      .eq("collection_id", testCollectionId)
      .order("position", { ascending: true });

    assert(
      reorderedMembers?.[0]?.product_id === p2 && reorderedMembers?.[0]?.position === 0 &&
      reorderedMembers?.[1]?.product_id === p0 && reorderedMembers?.[1]?.position === 1 &&
      reorderedMembers?.[2]?.product_id === p1 && reorderedMembers?.[2]?.position === 2,
      "Memberships updated accurately to new ordered positions: [p2 (0), p0 (1), p1 (2)]"
    );

    // Test Optimistic Concurrency Conflict
    const staleTimestamp = new Date(Date.now() - 100000).toISOString();
    const { error: staleErr } = await adminClientAuth.rpc("set_collection_products", {
      p_collection_id: testCollectionId,
      p_product_ids: [p0, p1],
      p_expected_updated_at: staleTimestamp,
    });

    assert(!!staleErr && staleErr.message.includes("Conflict"), "Stale expected_updated_at strictly rejected with Conflict error");
  }

  // ---------------------------------------------------------------------------
  // [6/7] Publication Lifecycle, Activation Guards & Active Invariants
  // ---------------------------------------------------------------------------
  console.log("\n[6/7] Testing Collection Activation, Archive, and Integrity Guards...");
  {
    // Activate collection with valid cover and members
    const { data: activated, error: actErr } = await (adminClient.from("collections") as any)
      .update({ is_active: true })
      .eq("id", testCollectionId)
      .select()
      .single();

    assert(!actErr && activated?.is_active === true, "Activated collection with valid cover and assigned products");
    currentUpdatedAt = activated.updated_at;

    // Public storefront can now read active collection
    const { data: publicCol } = await anonClient
      .from("collections")
      .select("id, slug, is_active")
      .eq("slug", testSlug)
      .maybeSingle();

    assert(publicCol?.slug === testSlug, "Public storefront returns active collection (200 OK)");

    // Guard Invariant: Attempt removing cover while collection is ACTIVE -> MUST FAIL
    const { error: activeRemoveErr } = await (adminClient.from("collections") as any)
      .update({ cover_image: null })
      .eq("id", testCollectionId);

    assert(!!activeRemoveErr, "DB activation guard strictly blocks removing cover from ACTIVE collection");

    // Guard Invariant: Attempt setting cover to empty string while ACTIVE -> MUST FAIL
    const { error: emptyCoverErr } = await (adminClient.from("collections") as any)
      .update({ cover_image: "   " })
      .eq("id", testCollectionId);

    assert(!!emptyCoverErr, "DB activation guard strictly blocks empty cover on ACTIVE collection");

    // Archive collection (is_active = false)
    const { data: archived, error: archErr } = await (adminClient.from("collections") as any)
      .update({ is_active: false })
      .eq("id", testCollectionId)
      .select()
      .single();

    assert(!archErr && archived?.is_active === false, "Archived collection (is_active = false)");
    currentUpdatedAt = archived.updated_at;

    // Now that collection is inactive, removing cover is ALLOWED
    const { error: inactRemoveErr } = await (adminClient.from("collections") as any)
      .update({ cover_image: null })
      .eq("id", testCollectionId);

    assert(!inactRemoveErr, "DB permits NULL cover_image on INACTIVE draft collection");

    // Attempt activating collection with NULL cover -> MUST FAIL
    const { error: actNoCoverErr } = await (adminClient.from("collections") as any)
      .update({ is_active: true })
      .eq("id", testCollectionId);

    assert(!!actNoCoverErr, "DB activation guard strictly blocks activating collection without cover image");
  }

  // ---------------------------------------------------------------------------
  // [7/7] Orphan Detection, Cleanup & Catalog Baseline Restoration
  // ---------------------------------------------------------------------------
  console.log("\n[7/7] Testing Orphan Detection & Clean Catalog Restoration...");
  {
    // Upload unreferenced orphan file
    const orphanPath = `collections/${testSlug}/cover-orphan12345678.webp`;
    await adminClient.storage.from("product-media").upload(orphanPath, makeWebpBuffer(), {
      contentType: "image/webp",
      upsert: true,
    });

    // Detect orphan
    const { data: files } = await adminClient.storage.from("product-media").list(`collections/${testSlug}`);
    const orphanFiles = (files || []).filter((f) => f.name.includes("orphan"));
    assert(orphanFiles.length > 0, "Identified orphaned file in collection storage folder");

    // Clean up orphan file
    await adminClient.storage.from("product-media").remove([orphanPath]);
    const { data: checkFiles } = await adminClient.storage.from("product-media").list(`collections/${testSlug}`);
    const remainingOrphans = (checkFiles || []).filter((f) => f.name.includes("orphan"));
    assert(remainingOrphans.length === 0, "Successfully cleaned up orphaned storage file");

    // Clean up test collection and its storage objects
    if (uploadedCoverPath) {
      await adminClient.storage.from("product-media").remove([uploadedCoverPath]);
    }
    await (adminClient.from("product_collections") as any).delete().eq("collection_id", testCollectionId);
    await (adminClient.from("collections") as any).delete().eq("id", testCollectionId);

    // Verify Clean Catalog Baseline
    const { count: prodCount } = await adminClient.from("products").select("*", { count: "exact", head: true });
    const { count: activeProdCount } = await adminClient.from("products").select("*", { count: "exact", head: true }).eq("is_active", true);
    const { count: colCount } = await adminClient.from("collections").select("*", { count: "exact", head: true });
    const { count: activeColCount } = await adminClient.from("collections").select("*", { count: "exact", head: true }).eq("is_active", true);
    const { count: memberCount } = await adminClient.from("product_collections").select("*", { count: "exact", head: true });
    const { count: imgCount } = await adminClient.from("product_images").select("*", { count: "exact", head: true });

    assert(prodCount === 42, `Clean baseline: exactly 42 products in database (got ${prodCount})`);
    assert(activeProdCount === 42, `Clean baseline: exactly 42 active products (got ${activeProdCount})`);
    assert(colCount === 6, `Clean baseline: exactly 6 collections in database (got ${colCount})`);
    assert(activeColCount === 6, `Clean baseline: exactly 6 active collections (got ${activeColCount})`);
    assert(memberCount === 63, `Clean baseline: exactly 63 product_collections (got ${memberCount})`);
    assert(imgCount === 42, `Clean baseline: exactly 42 product_images (got ${imgCount})`);
  }

  console.log("\n==================================================");
  console.log(`Assertions Passed: ${passed}`);
  console.log(`Assertions Failed: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    console.error(`❌ ${failed} ASSERTIONS FAILED`);
    process.exit(1);
  } else {
    console.log("🎉 ALL PHASE 9 COLLECTION VERIFICATION CHECKS PASSED!");
  }
}

runCollectionVerification().catch((err) => {
  console.error("Fatal error running Phase 9 collection verification:", err);
  process.exit(1);
});
