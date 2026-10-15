import type { ValidationError } from "class-validator";

import type { ValidationErrorDetail } from "./error-response.js";
import { RequestValidationError } from "./request-validation-error.js";

function collectDetails(errors: ValidationError[], parentPath: string): ValidationErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own: ValidationErrorDetail[] = error.constraints
      ? [{ field, messages: Object.values(error.constraints) }]
      : [];
    return [...own, ...collectDetails(error.children ?? [], field)];
  });
}

/** Turns class-validator errors into a `RequestValidationError`, one detail per field. */
export function validationExceptionFactory(errors: ValidationError[]): RequestValidationError {
  return new RequestValidationError(collectDetails(errors, ""));
}
