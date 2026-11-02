import { InvalidValueError } from "../../../../shared/domain/errors/index.js";

export class InvalidSortOrderError extends InvalidValueError {
  constructor() {
    super("INVALID_SORT_ORDER", "El orden tiene que ser un número entero desde 0.");
  }
}
