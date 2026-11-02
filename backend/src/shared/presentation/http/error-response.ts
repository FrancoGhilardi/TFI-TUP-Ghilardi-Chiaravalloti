import type { ErrorDetails } from "../../domain/errors/index.js";

/** Validation messages for a single request field. */
export interface ValidationErrorDetail {
  field: string;
  messages: string[];
}

/**
 * Body of every error response. `details` lists the invalid fields of a validation error, or
 * holds the facts a domain error declares for the client (`publicDetails`).
 */
export interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details?: ValidationErrorDetail[] | ErrorDetails;
  path: string;
  timestamp: string;
}
