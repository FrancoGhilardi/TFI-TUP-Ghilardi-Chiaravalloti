import type { ErrorFacts, ValidationErrorDetail } from "./api-types";

/** Codes for failures detected by the client itself; the API never sends them. */
export const CLIENT_ERROR_CODES = {
  network: "NETWORK_ERROR",
  timeout: "TIMEOUT",
  unexpectedResponse: "UNEXPECTED_RESPONSE",
} as const;

const VALIDATION_FAILED = "VALIDATION_FAILED";

interface ApiErrorInit {
  /** `0` when the request never got a response. */
  status: number;
  code: string;
  message: string;
  details?: ValidationErrorDetail[] | ErrorFacts;
  /** Seconds to wait before retrying, from `Retry-After`. */
  retryAfter?: number;
  cause?: unknown;
}

/** Any failed call to the API; `message` is always ready to show to the user. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ValidationErrorDetail[] | ErrorFacts;
  readonly retryAfter?: number;

  constructor({ status, code, message, details, retryAfter, cause }: ApiErrorInit) {
    super(message, { cause });
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryAfter = retryAfter;
  }

  /** Messages per field for `VALIDATION_FAILED`; empty for any other error. */
  fieldErrors(): Record<string, string[]> {
    if (this.code !== VALIDATION_FAILED || !Array.isArray(this.details)) {
      return {};
    }
    return Object.fromEntries(this.details.map(({ field, messages }) => [field, messages]));
  }
}
