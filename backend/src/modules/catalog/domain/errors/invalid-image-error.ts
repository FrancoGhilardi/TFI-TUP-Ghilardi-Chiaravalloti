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

/**
 * Same code for every reason. `position` names the image, counted from 1 as the panel shows
 * them; without it the message speaks of every image.
 */
export class InvalidImageError extends InvalidValueError {
  constructor(
    readonly reason: InvalidImageReason,
    readonly position?: number,
  ) {
    super(
      "INVALID_IMAGE",
      position === undefined ? FOR_ALL[reason] : `La imagen ${position} ${FOR_ONE[reason]}.`,
    );
  }
}
