import { Entity } from "../../../../shared/domain/entity.js";
import {
  IMAGE_ALT_TEXT_MAX_LENGTH,
  PRODUCT_IMAGES_MAX,
  PRODUCT_IMAGES_MIN,
} from "../catalog-limits.js";
import { ImageNotFailedError } from "../errors/image-not-failed-error.js";
import { type ImageNaming, InvalidImageError } from "../errors/invalid-image-error.js";
import { ImageStatus } from "../image-status.js";

/** The formats an image is accepted in, as the database checks them. */
export const PRODUCT_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ProductImageMimeType = (typeof PRODUCT_IMAGE_MIME_TYPES)[number];

export interface ProductImageProps {
  id: string;
  productId: string;
  /** From 1, the first one being the main image. */
  position: number;
  /** Where the uploaded file is kept, in the private storage. */
  originalKey: string;
  /** Where the processed versions are published; absent until processed. */
  publicKey?: string;
  altText?: string;
  mimeType: ProductImageMimeType;
  width?: number;
  height?: number;
  sizeBytes?: number;
  status: ImageStatus;
  /** Since when it waits to be processed; only a pending image has it. */
  pendingSince?: Date;
  /** Processings started since it last began to wait, finished or not. */
  processingAttempts: number;
  createdAt: Date;
}

/** What processing leaves: the public version and its size in pixels. */
export interface ProcessedImageInfo {
  publicKey: string;
  width: number;
  height: number;
}

/** A new original for an existing image. */
export interface ReplacementOriginal {
  originalKey: string;
  mimeType: ProductImageMimeType;
  sizeBytes: number;
}

export interface NewProductImageProps {
  id: string;
  productId: string;
  position: number;
  originalKey: string;
  altText?: string;
  mimeType: ProductImageMimeType;
  sizeBytes: number;
  now: Date;
}

/**
 * An image of a product. It is its own aggregate: it is added, replaced, reordered and
 * processed on its own, after the product exists.
 */
export class ProductImage extends Entity {
  private constructor(private readonly props: ProductImageProps) {
    super(props.id);
  }

  /** A new image waits to be processed. */
  static register(input: NewProductImageProps): ProductImage {
    const position = checkedPosition(input.position);
    return new ProductImage({
      id: input.id,
      productId: input.productId,
      position,
      originalKey: input.originalKey,
      altText: checkedAltText(input.altText, position),
      mimeType: input.mimeType,
      sizeBytes: checkedSize(input.sizeBytes),
      status: ImageStatus.PENDING,
      pendingSince: input.now,
      processingAttempts: 0,
      createdAt: input.now,
    });
  }

  static reconstitute(props: ProductImageProps): ProductImage {
    return new ProductImage({ ...props });
  }

  get productId(): string {
    return this.props.productId;
  }

  get position(): number {
    return this.props.position;
  }

  get originalKey(): string {
    return this.props.originalKey;
  }

  get publicKey(): string | undefined {
    return this.props.publicKey;
  }

  get altText(): string | undefined {
    return this.props.altText;
  }

  get mimeType(): ProductImageMimeType {
    return this.props.mimeType;
  }

  get width(): number | undefined {
    return this.props.width;
  }

  get height(): number | undefined {
    return this.props.height;
  }

  get sizeBytes(): number | undefined {
    return this.props.sizeBytes;
  }

  get status(): ImageStatus {
    return this.props.status;
  }

  get pendingSince(): Date | undefined {
    return this.props.pendingSince;
  }

  get processingAttempts(): number {
    return this.props.processingAttempts;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isPending(): boolean {
    return this.props.status === ImageStatus.PENDING;
  }

  /**
   * Only a pending image is processed, and only with a public version to show: a processed
   * image always has one. Gives the public version it had before, if any, to be removed.
   */
  markProcessed(info: ProcessedImageInfo): string | undefined {
    this.assertPending();
    if (info.publicKey.trim() === "") {
      throw new RangeError("A processed image has a public version");
    }
    for (const size of [info.width, info.height]) {
      if (!Number.isInteger(size) || size <= 0) {
        throw new RangeError("A processed image has a size in whole pixels");
      }
    }
    const previous = this.props.publicKey;
    this.props.publicKey = info.publicKey;
    this.props.width = info.width;
    this.props.height = info.height;
    this.props.status = ImageStatus.PROCESSED;
    this.props.pendingSince = undefined;
    return previous;
  }

  /**
   * Counts a processing about to start, before it does: one that never ends, such as one that
   * takes the process down, is counted all the same.
   */
  beginProcessingAttempt(): void {
    this.assertPending();
    this.props.processingAttempts++;
  }

  /** A processing that could not finish for a reason outside the image waits for another try. */
  postpone(now: Date): void {
    this.assertPending();
    this.props.pendingSince = now;
  }

  /** Its public version, if an earlier processing left one, stays until it is replaced. */
  markFailed(): void {
    this.assertPending();
    this.props.status = ImageStatus.FAILED;
    this.props.pendingSince = undefined;
  }

  /** Whether the alt text changed; a long one is told as the only image edited. */
  changeAltText(altText: string | undefined): boolean {
    const checked = checkedAltText(altText, "single");
    if (checked === this.props.altText) {
      return false;
    }
    this.props.altText = checked;
    return true;
  }

  /** The policy keeps the positions of a product from 1 with no gaps. */
  moveTo(position: number): void {
    this.props.position = checkedPosition(position);
  }

  /**
   * A new original, waiting to be processed. The public version, with its size, stays until
   * that processing replaces it, so the store keeps showing the image meanwhile. Gives the
   * original it replaced, to be removed.
   */
  replaceOriginal(original: ReplacementOriginal, now: Date): string {
    const previous = this.props.originalKey;
    this.props.originalKey = original.originalKey;
    this.props.mimeType = original.mimeType;
    this.props.sizeBytes = checkedSize(original.sizeBytes);
    this.props.status = ImageStatus.PENDING;
    this.props.pendingSince = now;
    this.props.processingAttempts = 0;
    return previous;
  }

  /** Only a failed image goes back to wait for processing. */
  retryProcessing(now: Date): void {
    if (this.props.status !== ImageStatus.FAILED) {
      throw new ImageNotFailedError();
    }
    this.props.status = ImageStatus.PENDING;
    this.props.pendingSince = now;
    this.props.processingAttempts = 0;
  }

  private assertPending(): void {
    if (!this.isPending()) {
      throw new Error(`Image ${this.id} is ${this.props.status}, not pending`);
    }
  }
}

function checkedPosition(position: number): number {
  if (
    !Number.isInteger(position) ||
    position < PRODUCT_IMAGES_MIN ||
    position > PRODUCT_IMAGES_MAX
  ) {
    throw new RangeError(`An image position goes from 1 to ${PRODUCT_IMAGES_MAX}`);
  }
  return position;
}

function checkedSize(sizeBytes: number): number {
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw new RangeError("An image has at least one byte");
  }
  return sizeBytes;
}

/** Trimmed; blank means none. Counted in code points, like the varchar column. */
function checkedAltText(altText: string | undefined, naming: ImageNaming): string | undefined {
  const trimmed = altText?.trim();
  if (!trimmed) {
    return undefined;
  }
  if ([...trimmed].length > IMAGE_ALT_TEXT_MAX_LENGTH) {
    throw new InvalidImageError("altText", naming);
  }
  return trimmed;
}
