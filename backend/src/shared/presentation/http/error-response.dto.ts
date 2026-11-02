import { ApiProperty, ApiPropertyOptional, getSchemaPath } from "@nestjs/swagger";
import type { ErrorDetails } from "../../domain/errors/domain-error.js";
import type { ErrorResponse, ValidationErrorDetail } from "./error-response.js";

/** A field the request got wrong, with every message for it. */
export class ValidationErrorDetailDto implements ValidationErrorDetail {
  /** Path of the field, such as `email` or `images.0`. */
  field!: string;

  /** In Spanish, to show next to the field. */
  messages!: string[];
}

/** The body of every error response; only describes it, the filter writes it. */
export class ErrorResponseDto implements ErrorResponse {
  /** The HTTP status, repeated in the body. */
  statusCode!: number;

  /** Stable identifier of the error, such as `PRODUCT_NOT_FOUND`. */
  code!: string;

  /** In Spanish, to show to the user. */
  message!: string;

  @ApiPropertyOptional({
    description:
      "One entry per invalid field for VALIDATION_FAILED, or facts the client can show for some domain errors, such as `{ count }` or `{ field }`.",
    oneOf: [
      { type: "array", items: { $ref: getSchemaPath(ValidationErrorDetailDto) } },
      {
        type: "object",
        additionalProperties: {
          oneOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
        },
      },
    ],
  })
  details?: ValidationErrorDetail[] | ErrorDetails;

  /** The request path, without its query string. */
  path!: string;

  @ApiProperty({ format: "date-time" })
  timestamp!: string;
}
