import { applyDecorators } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";
import { ErrorResponseDto } from "./error-response.dto.js";

/** Security schemes of the OpenAPI document. */
export const ACCESS_TOKEN_AUTH = "access-token";
export const REFRESH_TOKEN_AUTH = "refresh-token";

/** The 400 any endpoint with input answers when the request does not pass validation. */
export const VALIDATION_FAILED = "VALIDATION_FAILED";

/** The `code` values an endpoint can answer with, by HTTP status. */
export type ErrorCodes = Partial<
  Record<400 | 401 | 403 | 404 | 409 | 422 | 501 | 502 | 503, string[]>
>;

/**
 * Documents the errors of an endpoint, or of every endpoint of a controller: each status with
 * the common error body and the codes it can carry. Every route also answers 429 and 500,
 * added to the whole document, so they are not repeated here.
 */
export const ApiErrors = (codes: ErrorCodes) =>
  applyDecorators(
    ...Object.entries(codes).map(([status, list]) =>
      ApiResponse({
        status: Number(status),
        type: ErrorResponseDto,
        description: `Codes: ${list.map((code) => `\`${code}\``).join(", ")}.`,
      }),
    ),
  );
