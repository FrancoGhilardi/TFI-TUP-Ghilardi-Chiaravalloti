import { EntityNotFoundError } from "../../../../shared/domain/errors/index.js";

export class ProductNotFoundError extends EntityNotFoundError {
  constructor() {
    super("PRODUCT_NOT_FOUND", "No encontramos el producto.");
  }
}
