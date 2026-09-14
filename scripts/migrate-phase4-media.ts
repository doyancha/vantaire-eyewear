import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { VANTAIRE_NAMESPACE, generateDeterministicUuid } from "./generate-phase3-seed";
import { MediaManifest, buildMediaManifest } from "./generate-phase4-media-manifest";

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

if (!SERVICE_ROLE_KEY) {
  console.error("❌ Fatal: SUPABASE_SERVICE_ROLE_KEY is required.");
  process.exit(1);
}

// -----------------------------------------------------------------------------
// [GUARD] TARGET ISOLATION
// -----------------------------------------------------------------------------
const parsedUrl = new URL(SUPABASE_URL);
if (parsedUrl.port !== "55321" && !SUPABASE_URL.includes("55321")) {
  console.error(`❌ Security Guard: Refusing to run media migration against non-local VANTAIRE port: ${SUPABASE_URL}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export interface MigrationSummary {
  totalChecked: number;
  objectsSkipped: number;
  objectsUploaded: number;
  objectsRepaired: number;
  productImagesSynced: number;
  collectionsSynced: number;
  errors: string[];
}

export async function runMediaMigration(): Promise<MigrationSummary> {
  console.log("==================================================");
  console.log("VANTAIRE EYEWEAR v1.3 — PHASE 4 MEDIA MIGRATION");
  console.log("==================================================");
  console.log(`Target Supabase URL: ${SUPABASE_URL}`);

  const summary: MigrationSummary = {
    totalChecked: 0,
    objectsSkipped: 0,
    objectsUploaded: 0,
    objectsRepaired: 0,
    productImagesSynced: 0,
    collectionsSynced: 0,
    errors: [],
  };

  // 1. Verify Storage bucket exists
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    throw new Error(`Failed to list storage buckets: ${bucketError.message}`);
  }
  const mediaBucket = buckets?.find((b) => b.id === "product-media");
  if (!mediaBucket) {
    throw new Error("Target storage bucket 'product-media' does not exist. Apply Phase 4 migration first.");
  }
  console.log("✓ Bucket 'product-media' verified.");

  // 2. Load or build Manifest
  const manifestPath = path.resolve(process.cwd(), "scripts/generated/phase4-media-manifest.json");
  let manifest: MediaManifest;
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  } else {
    console.log("Manifest file missing, generating on-the-fly...");
    manifest = buildMediaManifest();
  }

  if (manifest.totalEntries !== 48 || manifest.entries.length !== 48) {
    throw new Error(`Invalid manifest entry count: expected 48, got ${manifest.entries.length}`);
  }

  // 3. Verify Local Source Files & Hashes
  for (const entry of manifest.entries) {
    const localPath = path.resolve(process.cwd(), entry.sourcePath);
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local source file missing: ${entry.sourcePath}`);
    }
    const currentHash = crypto.createHash("sha256").update(fs.readFileSync(localPath)).digest("hex");
    if (currentHash !== entry.sha256) {
      throw new Error(`Hash mismatch for local source ${entry.sourcePath}: expected ${entry.sha256}, got ${currentHash}`);
    }
  }
  console.log(`✓ Verified integrity of all 48 local source assets.`);

  // 4. Query DB products & collections for mapping
  const { data: dbProducts, error: prodErr } = await supabase.from("products").select("id, slug, legacy_id");
  if (prodErr || !dbProducts) throw new Error(`Failed to query products: ${prodErr?.message}`);
  const productMap = new Map(dbProducts.map((p) => [p.slug, p]));

  const { data: dbCollections, error: collErr } = await supabase.from("collections").select("id, slug, cover_image");
  if (collErr || !dbCollections) throw new Error(`Failed to query collections: ${collErr?.message}`);
  const collectionMap = new Map(dbCollections.map((c) => [c.slug, c]));

  // 5. Migrate / Reconcile Storage Objects
  for (const entry of manifest.entries) {
    summary.totalChecked++;
    const localFullPath = path.resolve(process.cwd(), entry.sourcePath);
    const localBuffer = fs.readFileSync(localFullPath);
    const expectedSha = entry.sha256;

    // Check existing object in Storage
    let needsUpload = false;
    let isRepair = false;

    const { data: existingData, error: downloadError } = await supabase.storage
      .from("product-media")
      .download(entry.storagePath);

    if (downloadError || !existingData) {
      needsUpload = true;
    } else {
      const arrayBuffer = await existingData.arrayBuffer();
      const existingSha = crypto.createHash("sha256").update(Buffer.from(arrayBuffer)).digest("hex");
      if (existingSha === expectedSha) {
        summary.objectsSkipped++;
      } else {
        console.log(`  ! Hash drift detected for ${entry.storagePath}. Existing: ${existingSha.slice(0, 10)}... Expected: ${expectedSha.slice(0, 10)}... Repairing.`);
        needsUpload = true;
        isRepair = true;
      }
    }

    if (needsUpload) {
      const { error: uploadError } = await supabase.storage
        .from("product-media")
        .upload(entry.storagePath, localBuffer, {
          contentType: entry.mimeType,
          upsert: true,
        });

      if (uploadError) {
        const msg = `Upload failed for ${entry.storagePath}: ${uploadError.message}`;
        summary.errors.push(msg);
        console.error(`  ❌ ${msg}`);
      } else {
        if (isRepair) {
          summary.objectsRepaired++;
          console.log(`  ✓ Repaired storage object: ${entry.storagePath}`);
        } else {
          summary.objectsUploaded++;
          console.log(`  ✓ Uploaded storage object: ${entry.storagePath}`);
        }
      }
    }

    // 6. DB Metadata Sync
    if (entry.entityType === "product") {
      const dbProd = productMap.get(entry.slug);
      if (!dbProd) {
        const msg = `Database product not found for slug: ${entry.slug}`;
        summary.errors.push(msg);
        continue;
      }

      // Remove any obsolete image records for this product before inserting new content-addressed record
      await (supabase.from("product_images") as any)
        .delete()
        .eq("product_id", dbProd.id)
        .neq("storage_path", entry.storagePath);

      // Generate deterministic UUID for product_images row
      const imageId = generateDeterministicUuid(
        VANTAIRE_NAMESPACE,
        `image:${dbProd.id}:${entry.storagePath}`
      );

      const { error: imgUpsertErr } = await (supabase.from("product_images") as any).upsert(
        {
          id: imageId,
          product_id: dbProd.id,
          storage_path: entry.storagePath,
          alt_text: entry.altText,
          sort_order: entry.sortOrder ?? 0,
          is_primary: entry.isPrimary ?? true,
        },
        { onConflict: "id" }
      );

      if (imgUpsertErr) {
        const msg = `Failed to upsert product_images for ${entry.slug}: ${imgUpsertErr.message}`;
        summary.errors.push(msg);
        console.error(`  ❌ ${msg}`);
      } else {
        summary.productImagesSynced++;
      }
    } else if (entry.entityType === "collection") {
      const dbColl = collectionMap.get(entry.slug);
      if (!dbColl) {
        const msg = `Database collection not found for slug: ${entry.slug}`;
        summary.errors.push(msg);
        continue;
      }

      // Update collection cover_image to storage path
      if (dbColl.cover_image !== entry.storagePath) {
        const { error: collUpdateErr } = await (supabase.from("collections") as any)
          .update({ cover_image: entry.storagePath })
          .eq("id", dbColl.id);

        if (collUpdateErr) {
          const msg = `Failed to update cover_image for collection ${entry.slug}: ${collUpdateErr.message}`;
          summary.errors.push(msg);
          console.error(`  ❌ ${msg}`);
        } else {
          summary.collectionsSynced++;
          console.log(`  ✓ Updated collection cover_image for ${entry.slug} -> ${entry.storagePath}`);
        }
      } else {
        summary.collectionsSynced++;
      }
    }
  }

  // 7. Obsolete storage object cleanup
  const validPaths = new Set(manifest.entries.map((e) => e.storagePath));
  const { data: rootProdFiles } = await supabase.storage.from("product-media").list("products");
  if (rootProdFiles) {
    const obsolete = rootProdFiles.filter((f) => f.id !== null && !validPaths.has(`products/${f.name}`)).map((f) => `products/${f.name}`);
    if (obsolete.length > 0) {
      await supabase.storage.from("product-media").remove(obsolete);
      console.log(`  ✓ Cleaned ${obsolete.length} obsolete flat product objects from storage.`);
    }
  }
  const { data: rootCollFiles } = await supabase.storage.from("product-media").list("collections");
  if (rootCollFiles) {
    const obsolete = rootCollFiles.filter((f) => f.id !== null && !validPaths.has(`collections/${f.name}`)).map((f) => `collections/${f.name}`);
    if (obsolete.length > 0) {
      await supabase.storage.from("product-media").remove(obsolete);
      console.log(`  ✓ Cleaned ${obsolete.length} obsolete flat collection objects from storage.`);
    }
  }

  console.log("\n==================================================");
  console.log("MIGRATION EXECUTION SUMMARY");
  console.log("==================================================");
  console.log(`Total Manifest Entries Checked: ${summary.totalChecked}`);
  console.log(`Objects Preserved/Skipped:     ${summary.objectsSkipped}`);
  console.log(`Objects Newly Uploaded:        ${summary.objectsUploaded}`);
  console.log(`Objects Drift-Repaired:        ${summary.objectsRepaired}`);
  console.log(`product_images Synced:         ${summary.productImagesSynced} / 42`);
  console.log(`collections Covers Synced:     ${summary.collectionsSynced} / 6`);
  console.log(`Total Errors Encountered:      ${summary.errors.length}`);

  if (summary.errors.length > 0) {
    throw new Error(`Media migration completed with ${summary.errors.length} errors.`);
  }

  return summary;
}

if (require.main === module) {
  runMediaMigration().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
