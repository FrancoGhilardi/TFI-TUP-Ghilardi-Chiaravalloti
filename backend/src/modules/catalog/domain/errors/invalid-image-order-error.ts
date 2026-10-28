import { InvalidValueError } from "../../../../shared/domain/errors/index.js";

/** An order that is not exactly the product's images, each once. */
export class InvalidImageOrderError extends InvalidValueError {
  constructor() {
    super("INVALID_IMAGE_ORDER", "Mandá todas las imágenes del producto, cada una una sola vez.");
  }
}
