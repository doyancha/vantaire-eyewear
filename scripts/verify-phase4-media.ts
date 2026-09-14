import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { MediaManifest } from "./generate-phase4-media-manifest";

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
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error("❌ Fatal: SUPABASE_SERVICE_ROLE_KEY and ANON_KEY are required.");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedAssertions++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failedAssertions++;
  }
}

export async function verifyPhase4Media() {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 4 MEDIA & STORAGE PARITY VERIFICATION");
  console.log("==================================================");
  console.log(`Target URL: ${SUPABASE_URL}\n`);

  // 1. MANIFEST & LOCAL SOURCE VERIFICATION
  console.log("[1/6] Verifying Media Manifest & Local Source Assets...");
  const manifestPath = path.resolve(process.cwd(), "scripts/generated/phase4-media-manifest.json");
  assert(fs.existsSync(manifestPath), "phase4-media-manifest.json exists on disk");

  const manifest: MediaManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  assert(manifest.totalEntries === 48, `Manifest specifies exactly 48 entries (got ${manifest.totalEntries})`);
  assert(manifest.productEntries === 42, `Manifest specifies exactly 42 product entries (got ${manifest.productEntries})`);
  assert(manifest.collectionEntries === 6, `Manifest specifies exactly 6 collection entries (got ${manifest.collectionEntries})`);

  let localSourceHashMatches = 0;
  for (const entry of manifest.entries) {
    const fullLocal = path.resolve(process.cwd(), entry.sourcePath);
    if (fs.existsSync(fullLocal)) {
      const hash = crypto.createHash("sha256").update(fs.readFileSync(fullLocal)).digest("hex");
      if (hash === entry.sha256) {
        localSourceHashMatches++;
      }
    }
  }
  assert(localSourceHashMatches === 48, `All 48 local source assets exist and match manifest hashes (got ${localSourceHashMatches}/48)`);

  // 2. STORAGE OBJECTS ENUMERATION
  console.log("\n[2/6] Verifying Storage Objects Inventory...");
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const mediaBucket = buckets?.find((b) => b.id === "product-media");
  assert(Boolean(mediaBucket), "product-media bucket exists");
  assert(mediaBucket?.public === true, "product-media bucket is public");

  const { data: prodObjects } = await supabaseAdmin.storage.from("product-media").list("products", { limit: 100 });
  const { data: collObjects } = await supabaseAdmin.storage.from("product-media").list("collections", { limit: 100 });

  assert(prodObjects?.length === 42, `Exactly 42 product objects in products/ folder (got ${prodObjects?.length})`);
  assert(collObjects?.length === 6, `Exactly 6 collection objects in collections/ folder (got ${collObjects?.length})`);

  const totalBaselineObjects = (prodObjects?.length || 0) + (collObjects?.length || 0);
  assert(totalBaselineObjects === 48, `Exactly 48 total baseline objects managed in storage (got ${totalBaselineObjects})`);

  // 3. STORAGE BYTE & HASH PARITY (VIA SDK DOWNLOAD)
  console.log("\n[3/6] Verifying 48-Object Hash & Byte Size Parity (Storage SDK)...");
  let sdkHashMatches = 0;
  let sdkSizeMatches = 0;

  for (const entry of manifest.entries) {
    const { data: blob, error } = await supabaseAdmin.storage.from("product-media").download(entry.storagePath);
    if (error || !blob) {
      console.error(`  Download error for ${entry.storagePath}: ${error?.message}`);
      continue;
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    if (hash === entry.sha256) {
      sdkHashMatches++;
    } else {
      console.error(`  Hash mismatch for ${entry.storagePath}: local ${entry.sha256} vs remote ${hash}`);
    }

    if (buffer.length === entry.byteSize) {
      sdkSizeMatches++;
    } else {
      console.error(`  Size mismatch for ${entry.storagePath}: local ${entry.byteSize} vs remote ${buffer.length}`);
    }
  }

  assert(sdkHashMatches === 48, `48 / 48 HASH MATCH via Storage SDK download (got ${sdkHashMatches}/48)`);
  assert(sdkSizeMatches === 48, `48 / 48 SIZE MATCH via Storage SDK download (got ${sdkSizeMatches}/48)`);

  // 4. PUBLIC CDN / HTTP ENDPOINT RESOLUTION & PARITY
  console.log("\n[4/6] Verifying Public HTTP CDN URL Resolution & Byte Parity...");
  let httpSuccesses = 0;
  let httpHashMatches = 0;
  let httpFailures = 0;

  for (const entry of manifest.entries) {
    const { data: publicUrlData } = supabaseAdmin.storage.from("product-media").getPublicUrl(entry.storagePath);
    const publicUrl = publicUrlData.publicUrl;

    try {
      const response = await fetch(publicUrl);
      if (!response.ok) {
        httpFailures++;
        console.error(`  HTTP ${response.status} fetching public URL: ${publicUrl}`);
        continue;
      }

      httpSuccesses++;
      const buffer = Buffer.from(await response.arrayBuffer());
      const hash = crypto.createHash("sha256").update(buffer).digest("hex");
      if (hash === entry.sha256) {
        httpHashMatches++;
      } else {
        console.error(`  HTTP payload hash mismatch for ${publicUrl}`);
      }
    } catch (err: any) {
      httpFailures++;
      console.error(`  Fetch exception for ${publicUrl}: ${err?.message}`);
    }
  }

  assert(httpSuccesses === 48, `All 48 public URLs responded with HTTP 200 (got ${httpSuccesses}/48)`);
  assert(httpHashMatches === 48, `All 48 public HTTP payloads match SHA-256 (got ${httpHashMatches}/48)`);
  assert(httpFailures === 0, `PUBLIC STORAGE URL FAILURES: ${httpFailures}`);

  // 5. DATABASE PRODUCT_IMAGES TABLE VERIFICATION
  console.log("\n[5/6] Verifying Database product_images Rows & Constraints...");
  const { data: images, error: imgErr } = await supabaseAdmin
    .from("product_images")
    .select("id, product_id, storage_path, alt_text, sort_order, is_primary");

  if (imgErr || !images) {
    throw new Error(`Failed to query product_images: ${imgErr?.message}`);
  }

  assert(images.length === 42, `Exactly 42 product_images rows in database (got ${images.length})`);

  const uniqueProductIds = new Set(images.map((img) => img.product_id));
  assert(uniqueProductIds.size === 42, `42 unique product IDs in product_images (got ${uniqueProductIds.size})`);

  const uniqueImageIds = new Set(images.map((img) => img.id));
  assert(uniqueImageIds.size === 42, `42 unique deterministic image IDs (got ${uniqueImageIds.size})`);

  const primaryImages = images.filter((img) => img.is_primary === true);
  assert(primaryImages.length === 42, `PRIMARY PRODUCT_IMAGES: 42 (got ${primaryImages.length})`);

  // Verify all products have exactly 1 primary image
  const { data: dbProducts } = await supabaseAdmin.from("products").select("id, slug");
  const prodsWithoutPrimary = (dbProducts || []).filter(
    (p) => !images.some((img) => img.product_id === p.id && img.is_primary)
  );
  assert(prodsWithoutPrimary.length === 0, `0 products without primary image (got ${prodsWithoutPrimary.length})`);

  // 6. DATABASE COLLECTION COVER_IMAGE MAPPINGS
  console.log("\n[6/6] Verifying Collection Cover Image Database Mappings...");
  const { data: dbCollections } = await supabaseAdmin.from("collections").select("id, slug, cover_image");

  assert((dbCollections || []).length === 6, `Exactly 6 collections in database (got ${dbCollections?.length})`);

  let validCoverMappings = 0;
  for (const c of dbCollections || []) {
    const expectedPath = `collections/collection-${c.slug}.jpg`;
    if (c.cover_image === expectedPath) {
      validCoverMappings++;
    } else {
      console.error(`  Collection ${c.slug} cover_image unexpected: ${c.cover_image} (expected ${expectedPath})`);
    }
  }

  assert(validCoverMappings === 6, `COLLECTION STORAGE MAPPINGS: 6 / 6 (got ${validCoverMappings}/6)`);

  console.log("\n==================================================");
  console.log("PHASE 4 MEDIA VERIFICATION SUMMARY");
  console.log("==================================================");
  console.log(`Assertions Passed: ${passedAssertions}`);
  console.log(`Assertions Failed: ${failedAssertions}`);

  if (failedAssertions > 0) {
    throw new Error(`Phase 4 media verification failed with ${failedAssertions} assertion failures.`);
  }

  console.log("\n🎉 ALL PHASE 4 MEDIA VERIFICATION CHECKS PASSED!");
}

if (require.main === module) {
  verifyPhase4Media().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
