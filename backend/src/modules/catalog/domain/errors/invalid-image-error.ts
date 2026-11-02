import { InvalidValueError } from "../../../../shared/domain/errors/index.js";
import { IMAGE_ALT_TEXT_MAX_LENGTH, PRODUCT_IMAGE_MAX_BYTES } from "../catalog-limits.js";

export type InvalidImageReason = "type" | "size" | "altText";

const MAX_MEGABYTES = PRODUCT_IMAGE_MAX_BYTES / 1024 / 1024;

const FOR_ONE: Record<InvalidImageReason, string> = {
  type: "tiene que ser JPEG, PNG o WebP",
  size: `no puede pesar más de ${MAX_MEGABYTES} MB`,
  altText: `no puede tener un texto alternativo de más de ${IMAGE_ALT_TEXT_MAX_LENGTH} caracteres`,
};

const FOR_ALL: Record<InvalidImageReason, string> = {
  type: "Las imágenes tienen que ser JPEG, PNG o WebP.",
  size: `Las imágenes no pueden pesar más de ${MAX_MEGABYTES} MB.`,
  altText: `Los textos alternativos no pueden tener más de ${IMAGE_ALT_TEXT_MAX_LENGTH} caracteres.`,
};

/** The image a message names: by its position, the only one sent, or every image. */
export type ImageNaming = number | "single" | undefined;

function messageOf(reason: InvalidImageReason, naming: ImageNaming): string {
  if (naming === undefined) {
    return FOR_ALL[reason];
  }
  return naming === "single"
    ? `La imagen ${FOR_ONE[reason]}.`
    : `La imagen ${naming} ${FOR_ONE[reason]}.`;
}

/**
 * Same code for every reason. A number names the image by its position, counted from 1 as the
 * panel shows them; "single", the only image of an upload; nothing, every image.
 */
export class InvalidImageError extends InvalidValueError {
  readonly position?: number;

  constructor(
    readonly reason: InvalidImageReason,
    naming?: ImageNaming,
  ) {
    super("INVALID_IMAGE", messageOf(reason, naming));
    this.position = typeof naming === "number" ? naming : undefined;
  }
}
