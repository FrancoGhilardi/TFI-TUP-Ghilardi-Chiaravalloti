/** One invalid field of a request rejected with `VALIDATION_FAILED`. */
export interface ValidationErrorDetail {
  /** Path of the field, such as `email` or `images.0`. */
  field: string;
  /** In Spanish, to show next to the field. */
  messages: string[];
}

/** Facts some domain errors share with the client, such as `{ count }` or `{ field }`. */
export type ErrorFacts = Record<string, string | number | boolean>;

/** Body of every non-2xx response of the API. */
export interface ErrorResponse {
  timestamp: string;
  statusCode: number;
  /** Stable identifier of the error, such as `PRODUCT_NOT_FOUND`. */
  code: string;
  /** In Spanish for domain errors; generic HTTP errors may carry a technical text. */
  message: string;
  path: string;
  details?: ValidationErrorDetail[] | ErrorFacts;
}

export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PageQuery {
  page?: number;
  limit?: number;
}
