import { EntityNotFoundError } from "../../../../shared/domain/errors/index.js";

export class CategoryNotFoundError extends EntityNotFoundError {
  constructor() {
    super("CATEGORY_NOT_FOUND", "No encontramos la categoría.");
  }
}
