import type { ProductImageMimeType } from "../../domain/entities/product-image.js";
import { type ImageNaming, InvalidImageError } from "../../domain/errors/invalid-image-error.js";

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length &&
  signature.every((byte, index) => bytes[offset + index] === byte);

// "RIFF" and "WEBP" in ASCII.
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

/**
 * The format of an image read from its first bytes, never from the name or the type the
 * client declared, or `undefined` when it is none of the accepted ones.
 */
export function detectImageType(bytes: Uint8Array): ProductImageMimeType | undefined {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) {
    return "image/webp";
  }
  return undefined;
}

/**
 * The format of an uploaded file, checked against the size limit first; a file too big or of
 * another format is an `InvalidImageError` naming the image as `naming` says.
 */
export function checkedImageType(
  bytes: Uint8Array,
  maxSizeBytes: number,
  naming: ImageNaming,
): ProductImageMimeType {
  if (bytes.length > maxSizeBytes) {
    throw new InvalidImageError("size", naming);
  }
  const mimeType = detectImageType(bytes);
  if (mimeType === undefined) {
    throw new InvalidImageError("type", naming);
  }
  return mimeType;
}
