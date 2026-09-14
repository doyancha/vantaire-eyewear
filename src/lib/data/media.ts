/**
 * Media URL Resolution & Path Validation
 * -----------------------------------------------------------------------------
 * Provides pure, deterministic resolution of Supabase Storage object paths into
 * environment-aware public CDN URLs.
 * Enforces strict path validation against path traversal and malformed inputs.
 */

export const BUCKET_NAME = "product-media";

/**
 * Validates a storage path according to VANTAIRE catalog invariants.
 * Throws an Error if the path is invalid.
 */
export function validateStoragePath(storagePath: string): void {
  if (!storagePath || typeof storagePath !== "string") {
    throw new Error("Storage path must be a non-empty string.");
  }

  // Reject path traversal
  if (storagePath.includes("..")) {
    throw new Error(`Path traversal detected in storage path: ${storagePath}`);
  }

  // Reject backslashes
  if (storagePath.includes("\\")) {
    throw new Error(`Backslashes not permitted in storage path: ${storagePath}`);
  }

  // Reject leading slashes
  if (storagePath.startsWith("/")) {
    throw new Error(`Leading slash not permitted in storage path: ${storagePath}`);
  }

  // Reject external protocols or URLs masquerading as storage keys
  if (
    storagePath.startsWith("http://") ||
    storagePath.startsWith("https://") ||
    storagePath.startsWith("//")
  ) {
    throw new Error(`External URLs not permitted as storage path: ${storagePath}`);
  }

  // Enforce expected managed object root prefixes
  if (!storagePath.startsWith("products/") && !storagePath.startsWith("collections/")) {
    throw new Error(
      `Storage path must begin with 'products/' or 'collections/': ${storagePath}`
    );
  }
}

/**
 * Builds the canonical public URL for a given storage path in the product-media bucket.
 * Encodes URI segments safely while preserving valid slashes.
 */
export function buildPublicStorageUrl(storagePath: string): string {
  // If already a valid public path (e.g. local static fallback /images/...), return as-is
  if (storagePath.startsWith("/images/")) {
    return storagePath;
  }

  validateStoragePath(storagePath);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:55321";
  const baseUrl = supabaseUrl.replace(/\/+$/, "");

  // Encode each segment of the path except the forward slashes
  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${baseUrl}/storage/v1/object/public/${BUCKET_NAME}/${encodedPath}`;
}
