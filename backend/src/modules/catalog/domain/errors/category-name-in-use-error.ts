import { ConflictError } from "../../../../shared/domain/errors/index.js";

/** Another current category has the same name, ignoring case. */
export class CategoryNameInUseError extends ConflictError {
  constructor() {
    super("CATEGORY_NAME_IN_USE", "Ya existe una categoría con ese nombre.");
  }
}
