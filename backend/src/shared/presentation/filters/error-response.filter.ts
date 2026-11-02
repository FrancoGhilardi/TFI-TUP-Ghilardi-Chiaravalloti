import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";

import {
  AuthenticationError,
  BusinessRuleViolationError,
  ConflictError,
  DomainError,
  EntityNotFoundError,
  ForbiddenActionError,
  InvalidValueError,
} from "../../domain/errors/index.js";
import type { ErrorResponse } from "../http/error-response.js";
import { RequestValidationError } from "../http/request-validation-error.js";
import { extractSqlState } from "./postgres-error.js";

const INTERNAL_ERROR_MESSAGE = "Internal server error";
const FIRST_SERVER_ERROR_STATUS: number = HttpStatus.INTERNAL_SERVER_ERROR;

type ErrorBody = Pick<ErrorResponse, "statusCode" | "code" | "message" | "details">;

const DOMAIN_ERROR_STATUS: [typeof DomainError, HttpStatus][] = [
  [InvalidValueError, HttpStatus.BAD_REQUEST],
  [AuthenticationError, HttpStatus.UNAUTHORIZED],
  [ForbiddenActionError, HttpStatus.FORBIDDEN],
  [EntityNotFoundError, HttpStatus.NOT_FOUND],
  [ConflictError, HttpStatus.CONFLICT],
  [BusinessRuleViolationError, HttpStatus.UNPROCESSABLE_ENTITY],
];

/** Shown to end users as is, so they are written in Spanish and free of technical terms. */
export const DATABASE_ERROR_MESSAGES = {
  UNIQUE_VIOLATION:
    "Ya existe un registro con estos datos. Revisá la información e intentá de nuevo.",
  FOREIGN_KEY_VIOLATION:
    "No se pudo completar la operación porque hace referencia a datos que no existen o que todavía se están usando en otro lugar.",
  CHECK_VIOLATION: "No se pudo completar la operación porque no cumple con las reglas del sistema.",
} as const;

type DatabaseErrorCode = keyof typeof DATABASE_ERROR_MESSAGES;

function databaseError(statusCode: HttpStatus, code: DatabaseErrorCode): ErrorBody {
  return { statusCode, code, message: DATABASE_ERROR_MESSAGES[code] };
}

const SQL_STATE_ERRORS: Record<string, ErrorBody> = {
  "23505": databaseError(HttpStatus.CONFLICT, "UNIQUE_VIOLATION"),
  "23503": databaseError(HttpStatus.CONFLICT, "FOREIGN_KEY_VIOLATION"),
  "23514": databaseError(HttpStatus.UNPROCESSABLE_ENTITY, "CHECK_VIOLATION"),
};

const HTTP_STATUS_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: "BAD_REQUEST",
  [HttpStatus.UNAUTHORIZED]: "UNAUTHORIZED",
  [HttpStatus.FORBIDDEN]: "FORBIDDEN",
  [HttpStatus.NOT_FOUND]: "NOT_FOUND",
  [HttpStatus.CONFLICT]: "CONFLICT",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "UNPROCESSABLE_ENTITY",
  [HttpStatus.METHOD_NOT_ALLOWED]: "METHOD_NOT_ALLOWED",
  [HttpStatus.NOT_ACCEPTABLE]: "NOT_ACCEPTABLE",
  [HttpStatus.REQUEST_TIMEOUT]: "REQUEST_TIMEOUT",
  [HttpStatus.GONE]: "GONE",
  [HttpStatus.PAYLOAD_TOO_LARGE]: "PAYLOAD_TOO_LARGE",
  [HttpStatus.UNSUPPORTED_MEDIA_TYPE]: "UNSUPPORTED_MEDIA_TYPE",
  [HttpStatus.TOO_MANY_REQUESTS]: "TOO_MANY_REQUESTS",
  [HttpStatus.INTERNAL_SERVER_ERROR]: "INTERNAL_ERROR",
  [HttpStatus.BAD_GATEWAY]: "BAD_GATEWAY",
  [HttpStatus.SERVICE_UNAVAILABLE]: "SERVICE_UNAVAILABLE",
  [HttpStatus.GATEWAY_TIMEOUT]: "GATEWAY_TIMEOUT",
};

/**
 * Global filter that turns any thrown value into the uniform `ErrorResponse`.
 * Server errors are logged with their stack but never expose internal details.
 */
@Catch()
export class ErrorResponseFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorResponseFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response: unknown = ctx.getResponse();
    if (httpAdapter.isHeadersSent(response)) {
      return;
    }

    const body = this.toBody(exception);
    if (body.statusCode >= FIRST_SERVER_ERROR_STATUS) {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const url = String(httpAdapter.getRequestUrl(ctx.getRequest()));
    const payload: ErrorResponse = {
      ...body,
      path: url.split("?")[0],
      timestamp: new Date().toISOString(),
    };
    httpAdapter.reply(response, payload, body.statusCode);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof DomainError) {
      return this.fromDomainError(exception);
    }
    const sqlState = extractSqlState(exception);
    if (sqlState !== undefined && sqlState in SQL_STATE_ERRORS) {
      return this.fromDatabaseError(sqlState);
    }
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }
    return this.fromUnknown();
  }

  private fromDomainError(error: DomainError): ErrorBody {
    const match = DOMAIN_ERROR_STATUS.find(([type]) => error instanceof type);
    if (!match) {
      return this.fromUnknown();
    }
    return {
      statusCode: match[1],
      code: error.code,
      message: error.message,
      ...(error instanceof RequestValidationError && { details: error.details }),
    };
  }

  private fromDatabaseError(sqlState: string): ErrorBody {
    return SQL_STATE_ERRORS[sqlState];
  }

  private fromHttpException(exception: HttpException): ErrorBody {
    const statusCode = exception.getStatus();
    return {
      statusCode,
      code: HTTP_STATUS_CODES[statusCode] ?? "HTTP_ERROR",
      message: statusCode >= FIRST_SERVER_ERROR_STATUS ? INTERNAL_ERROR_MESSAGE : exception.message,
    };
  }

  private fromUnknown(): ErrorBody {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: "INTERNAL_ERROR",
      message: INTERNAL_ERROR_MESSAGE,
    };
  }
}
