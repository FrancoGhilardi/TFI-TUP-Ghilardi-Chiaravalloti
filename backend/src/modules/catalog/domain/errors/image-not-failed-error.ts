import { BusinessRuleViolationError } from "../../../../shared/domain/errors/index.js";

export class ImageNotFailedError extends BusinessRuleViolationError {
  constructor() {
    super("IMAGE_NOT_FAILED", "Solo se puede reintentar una imagen cuyo procesado falló.");
  }
}
