import { EntityNotFoundError } from "../../../../shared/domain/errors/index.js";

export class ProductImageNotFoundError extends EntityNotFoundError {
  constructor() {
    super("PRODUCT_IMAGE_NOT_FOUND", "No encontramos la imagen.");
  }
}
