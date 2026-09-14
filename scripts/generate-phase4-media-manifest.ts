import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { PRODUCTS, COLLECTIONS_META } from "../src/data/products";

export interface MediaManifestEntry {
  entityType: "product" | "collection";
  slug: string;
  legacyId: string | null;
  name: string;
  sourcePath: string;
  storagePath: string;
  sha256: string;
  byteSize: number;
  mimeType: string;
  isPrimary?: boolean;
  sortOrder?: number;
  altText: string;
}

export interface MediaManifest {
  manifestVersion: "1.3";
  bucketName: "product-media";
  totalEntries: number;
  productEntries: number;
  collectionEntries: number;
  entries: MediaManifestEntry[];
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      throw new Error(`Unsupported MIME type extension: ${ext}`);
  }
}

function computeFileSha256(fullPath: string): string {
  const buffer = fs.readFileSync(fullPath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function buildMediaManifest(rootDir: string = process.cwd()): MediaManifest {
  const entries: MediaManifestEntry[] = [];

  // Sort products deterministically by slug
  const sortedProducts = [...PRODUCTS].sort((a, b) => a.slug.localeCompare(b.slug));

  for (const product of sortedProducts) {
    const rawImagePath = product.images[0];
    if (!rawImagePath) {
      throw new Error(`Product ${product.slug} has no images specified.`);
    }

    // Convert leading slash to relative public/ path
    const normalizedRelative = rawImagePath.startsWith("/")
      ? `public${rawImagePath}`
      : `public/${rawImagePath}`;
    const fullPath = path.resolve(rootDir, normalizedRelative);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing source image file for product ${product.slug}: ${fullPath}`);
    }

    const stat = fs.statSync(fullPath);
    const sha256 = computeFileSha256(fullPath);
    const mimeType = getMimeType(fullPath);
    const hashPrefix = sha256.slice(0, 12);

    entries.push({
      entityType: "product",
      slug: product.slug,
      legacyId: product.id,
      name: product.name,
      sourcePath: normalizedRelative.replace(/\\/g, "/"),
      storagePath: `products/${product.slug}/primary-${hashPrefix}.jpg`,
      sha256,
      byteSize: stat.size,
      mimeType,
      isPrimary: true,
      sortOrder: 0,
      altText: `${product.name} primary presentation`,
    });
  }

  // Sort collections deterministically by slug
  const sortedCollections = [...COLLECTIONS_META].sort((a, b) => a.slug.localeCompare(b.slug));

  for (const collection of sortedCollections) {
    const rawImagePath = collection.coverImage;
    if (!rawImagePath) {
      throw new Error(`Collection ${collection.slug} has no cover image specified.`);
    }

    const normalizedRelative = rawImagePath.startsWith("/")
      ? `public${rawImagePath}`
      : `public/${rawImagePath}`;
    const fullPath = path.resolve(rootDir, normalizedRelative);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing source cover file for collection ${collection.slug}: ${fullPath}`);
    }

    const stat = fs.statSync(fullPath);
    const sha256 = computeFileSha256(fullPath);
    const mimeType = getMimeType(fullPath);
    const hashPrefix = sha256.slice(0, 12);

    entries.push({
      entityType: "collection",
      slug: collection.slug,
      legacyId: null,
      name: collection.name,
      sourcePath: normalizedRelative.replace(/\\/g, "/"),
      storagePath: `collections/${collection.slug}/cover-${hashPrefix}.jpg`,
      sha256,
      byteSize: stat.size,
      mimeType,
      altText: `${collection.name} collection cover`,
    });
  }

  return {
    manifestVersion: "1.3",
    bucketName: "product-media",
    totalEntries: entries.length,
    productEntries: sortedProducts.length,
    collectionEntries: sortedCollections.length,
    entries,
  };
}

export function writeMediaManifest(outputFilePath?: string): MediaManifest {
  const rootDir = process.cwd();
  const targetPath =
    outputFilePath || path.resolve(rootDir, "scripts/generated/phase4-media-manifest.json");

  const manifest = buildMediaManifest(rootDir);

  const outDir = path.dirname(targetPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const jsonContent = JSON.stringify(manifest, null, 2) + "\n";
  fs.writeFileSync(targetPath, jsonContent, "utf-8");

  console.log(`✓ Media manifest generated successfully: ${targetPath}`);
  console.log(`  Total entries: ${manifest.totalEntries} (Products: ${manifest.productEntries}, Collections: ${manifest.collectionEntries})`);

  return manifest;
}

if (require.main === module) {
  writeMediaManifest();
}
