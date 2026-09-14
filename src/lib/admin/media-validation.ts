import crypto from "crypto";

export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export type SupportedMimeType = "image/jpeg" | "image/png" | "image/webp";

export interface SniffedImageInfo {
  mimeType: SupportedMimeType;
  extension: "jpg" | "png" | "webp";
  sha256Hex: string;
  sha256Prefix16: string;
}

/**
 * Sniffs magic bytes to verify genuine JPEG, PNG, or WebP image formats.
 * Prevents MIME spoofing attacks where arbitrary files are disguised with image extensions or headers.
 */
export function sniffImageMagicBytes(buffer: Buffer): SniffedImageInfo | null {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  const sha256Hex = crypto.createHash("sha256").update(buffer).digest("hex");
  const sha256Prefix16 = sha256Hex.slice(0, 16);

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      mimeType: "image/jpeg",
      extension: "jpg",
      sha256Hex,
      sha256Prefix16,
    };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      mimeType: "image/png",
      extension: "png",
      sha256Hex,
      sha256Prefix16,
    };
  }

  // WebP: RIFF....WEBP (bytes 0-3 = "RIFF", bytes 8-11 = "WEBP")
  if (
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return {
      mimeType: "image/webp",
      extension: "webp",
      sha256Hex,
      sha256Prefix16,
    };
  }

  return null;
}

/**
 * Validates file buffer, size, and magic bytes.
 */
export function validateImageUpload(
  buffer: Buffer,
  reportedMimeType?: string
): { success: true; info: SniffedImageInfo } | { success: false; error: string } {
  if (!buffer || buffer.length === 0) {
    return { success: false, error: "Image file is empty." };
  }

  if (buffer.length > MAX_IMAGE_FILE_SIZE) {
    return {
      success: false,
      error: `File size exceeds maximum permitted 5 MB limit (${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  const sniffed = sniffImageMagicBytes(buffer);
  if (!sniffed) {
    return {
      success: false,
      error: "Invalid image file format. Only genuine JPEG, PNG, and WebP images are permitted.",
    };
  }

  if (reportedMimeType) {
    const normalizedReported = reportedMimeType.toLowerCase().trim();
    // Allow image/jpeg vs image/jpg normalization
    const matchesJpeg =
      sniffed.mimeType === "image/jpeg" &&
      (normalizedReported === "image/jpeg" || normalizedReported === "image/jpg");
    const matchesExact = sniffed.mimeType === normalizedReported;

    if (!matchesExact && !matchesJpeg) {
      return {
        success: false,
        error: `MIME type mismatch: declared '${reportedMimeType}' but binary content is '${sniffed.mimeType}'.`,
      };
    }
  }

  return { success: true, info: sniffed };
}

/**
 * Constructs canonical, content-addressed storage path for product media:
 * products/{slug}/image-{16hex}.{ext}
 */
export function buildProductStoragePath(
  productSlug: string,
  prefix16: string,
  extension: "jpg" | "png" | "webp"
): string {
  const sanitizedSlug = productSlug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
  return `products/${sanitizedSlug}/image-${prefix16}.${extension}`;
}

/**
 * Validates alt text.
 */
export function validateAltText(altText: string): { success: true; value: string } | { success: false; error: string } {
  const trimmed = (altText || "").trim();
  if (!trimmed) {
    return { success: false, error: "Alt text is required for accessibility." };
  }
  if (trimmed.length < 2) {
    return { success: false, error: "Alt text must be at least 2 characters long." };
  }
  if (trimmed.length > 200) {
    return { success: false, error: "Alt text cannot exceed 200 characters." };
  }
  return { success: true, value: trimmed };
}
