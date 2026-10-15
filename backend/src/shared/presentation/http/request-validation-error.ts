import { InvalidValueError } from "../../domain/errors/index.js";
import type { ValidationErrorDetail } from "./error-response.js";

/** Request validation failure with the invalid fields listed in `details`. */
export class RequestValidationError extends InvalidValueError {
  constructor(readonly details: ValidationErrorDetail[]) {
    super("VALIDATION_FAILED", "Request validation failed");
  }
}
