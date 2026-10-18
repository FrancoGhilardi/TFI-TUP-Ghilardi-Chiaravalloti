import { ForbiddenActionError } from "../../../../shared/domain/errors/index.js";

/** The request does not come from the frontend, or its origin cannot be determined. */
export class OriginNotAllowedError extends ForbiddenActionError {
  constructor() {
    super("ORIGIN_NOT_ALLOWED", "No se pudo verificar el origen de la solicitud.");
  }
}
