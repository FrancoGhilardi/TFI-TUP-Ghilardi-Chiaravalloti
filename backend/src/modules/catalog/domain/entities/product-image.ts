import { Entity } from "../../../../shared/domain/entity.js";
import {
  IMAGE_ALT_TEXT_MAX_LENGTH,
  PRODUCT_IMAGES_MAX,
  PRODUCT_IMAGES_MIN,
} from "../catalog-limits.js";
import { InvalidImageError } from "../errors/invalid-image-error.js";
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
  createdAt: Date;
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
    const { position } = input;
    if (
      !Number.isInteger(position) ||
      position < PRODUCT_IMAGES_MIN ||
      position > PRODUCT_IMAGES_MAX
    ) {
      throw new RangeError(`An image position goes from 1 to ${PRODUCT_IMAGES_MAX}`);
    }
    if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) {
      throw new RangeError("An image has at least one byte");
    }
    return new ProductImage({
      id: input.id,
      productId: input.productId,
      position,
      originalKey: input.originalKey,
      altText: checkedAltText(input.altText, position),
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      status: ImageStatus.PENDING,
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

  get createdAt(): Date {
    return this.props.createdAt;
  }
}

/** Trimmed; blank means none. Counted in code points, like the varchar column. */
function checkedAltText(altText: string | undefined, position: number): string | undefined {
  const trimmed = altText?.trim();
  if (!trimmed) {
    return undefined;
  }
  if ([...trimmed].length > IMAGE_ALT_TEXT_MAX_LENGTH) {
    throw new InvalidImageError("altText", position);
  }
  return trimmed;
}
