import { InvalidValueError } from "../../../../shared/domain/errors/index.js";

export class InvalidImageCountError extends InvalidValueError {
  constructor() {
    super("INVALID_IMAGE_COUNT", "El producto tiene que tener entre 1 y 5 imágenes.");
  }
}
