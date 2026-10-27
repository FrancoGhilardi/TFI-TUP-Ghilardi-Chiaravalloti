import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";

import { stackWithCauses } from "../../application/error-stack.js";

import {
  AuthenticationError,
  BusinessRuleViolationError,
  ConflictError,
  DomainError,
  EntityNotFoundError,
  ExternalServiceError,
  ForbiddenActionError,
  InvalidValueError,
} from "../../domain/errors/index.js";
import type { ErrorResponse } from "../http/error-response.js";
import { NotImplementedYetError } from "../http/not-implemented-yet-error.js";
import { RequestValidationError } from "../http/request-validation-error.js";
import { extractSqlState } from "./postgres-error.js";

const INTERNAL_ERROR_MESSAGE = "Internal server error";
const FIRST_SERVER_ERROR_STATUS: number = HttpStatus.INTERNAL_SERVER_ERROR;

type ErrorBody = Pick<ErrorResponse, "statusCode" | "code" | "message" | "details">;

interface DomainErrorMapping {
  type: typeof DomainError;
  status: HttpStatus;
  /** A real failure someone has to look into, unlike an expected outcome of the request. */
  logged: boolean;
}

const DOMAIN_ERRORS: DomainErrorMapping[] = [
  { type: InvalidValueError, status: HttpStatus.BAD_REQUEST, logged: false },
  { type: AuthenticationError, status: HttpStatus.UNAUTHORIZED, logged: false },
  { type: ForbiddenActionError, status: HttpStatus.FORBIDDEN, logged: false },
  { type: EntityNotFoundError, status: HttpStatus.NOT_FOUND, logged: false },
  { type: ConflictError, status: HttpStatus.CONFLICT, logged: false },
  { type: BusinessRuleViolationError, status: HttpStatus.UNPROCESSABLE_ENTITY, logged: false },
  { type: NotImplementedYetError, status: HttpStatus.NOT_IMPLEMENTED, logged: false },
  { type: ExternalServiceError, status: HttpStatus.BAD_GATEWAY, logged: true },
];

const mappingOf = (exception: unknown) =>
  exception instanceof DomainError
    ? DOMAIN_ERRORS.find(({ type }) => exception instanceof type)
    : undefined;

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

    const mapping = mappingOf(exception);
    const body = this.toBody(exception, mapping);
    // Unmapped errors are failures nobody anticipated, so they are always logged.
    if (body.statusCode >= FIRST_SERVER_ERROR_STATUS && (mapping?.logged ?? true)) {
      // A single text, so the logger never takes the details for its context. It starts with
      // the error itself, a domain error named by class and code rather than its user text.
      this.logger.error(stackWithCauses(exception));
    }

    const url = String(httpAdapter.getRequestUrl(ctx.getRequest()));
    const payload: ErrorResponse = {
      ...body,
      path: url.split("?")[0],
      timestamp: new Date().toISOString(),
    };
    // A route may have declared a cache for its success; an error must never be reused.
    httpAdapter.setHeader(response, "Cache-Control", "no-store");
    httpAdapter.reply(response, payload, body.statusCode);
  }

  private toBody(exception: unknown, mapping: DomainErrorMapping | undefined): ErrorBody {
    if (exception instanceof DomainError) {
      return this.fromDomainError(exception, mapping);
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

  private fromDomainError(error: DomainError, mapping: DomainErrorMapping | undefined): ErrorBody {
    if (mapping === undefined) {
      return this.fromUnknown();
    }
    // Only what an error declares for the client is sent, never any other property.
    const details = error instanceof RequestValidationError ? error.details : error.publicDetails;
    return {
      statusCode: mapping.status,
      code: error.code,
      message: error.message,
      ...(details !== undefined && { details }),
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
