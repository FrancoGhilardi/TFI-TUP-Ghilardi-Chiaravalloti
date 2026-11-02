/** Validation messages for a single request field. */
export interface ValidationErrorDetail {
  field: string;
  messages: string[];
}

/** Body of every error response. `details` is only present for validation errors. */
export interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details?: ValidationErrorDetail[];
  path: string;
  timestamp: string;
}
