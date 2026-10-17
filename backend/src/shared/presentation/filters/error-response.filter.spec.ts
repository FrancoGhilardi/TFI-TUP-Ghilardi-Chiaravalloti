import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  type ArgumentsHost,
} from "@nestjs/common";
import type { HttpAdapterHost } from "@nestjs/core";

import {
  AuthenticationError,
  BusinessRuleViolationError,
  ConflictError,
  EntityNotFoundError,
  ForbiddenActionError,
  InvalidValueError,
} from "../../domain/errors/index.js";
import type { ErrorResponse } from "../http/error-response.js";
import { RequestValidationError } from "../http/request-validation-error.js";
import { ErrorResponseFilter } from "./error-response.filter.js";

class TestInvalidValueError extends InvalidValueError {
  constructor() {
    super("BAD_VALUE", "Bad value");
  }
}
class TestAuthenticationError extends AuthenticationError {
  constructor() {
    super("BAD_CREDENTIALS", "Bad credentials");
  }
}
class TestForbiddenActionError extends ForbiddenActionError {
  constructor() {
    super("NOT_ALLOWED", "Not allowed");
  }
}
class TestEntityNotFoundError extends EntityNotFoundError {
  constructor() {
    super("THING_NOT_FOUND", "Thing not found");
  }
}
class TestConflictError extends ConflictError {
  constructor() {
    super("THING_EXISTS", "Thing exists");
  }
}
class TestBusinessRuleViolationError extends BusinessRuleViolationError {
  constructor() {
    super("RULE_BROKEN", "Rule broken");
  }
}
class TestUnrelatedDetailsError extends ConflictError {
  readonly details = [{ field: "secret", messages: ["internal"] }];
  constructor() {
    super("HAS_DETAILS", "Has details");
  }
}

function pgError(code: string): Error {
  return Object.assign(new Error('duplicate key value violates "users_email_key"'), {
    code,
    constraint: "users_email_key",
  });
}

function drizzleError(code: string): Error {
  return new Error("Failed query: insert into users", { cause: pgError(code) });
}

function setup(options: { headersSent?: boolean; url?: string } = {}) {
  const reply = vi.fn();
  const adapter = {
    reply,
    isHeadersSent: vi.fn().mockReturnValue(options.headersSent ?? false),
    getRequestUrl: vi.fn().mockReturnValue(options.url ?? "/api/v1/things?token=secret"),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({}),
      getRequest: () => ({}),
    }),
  } as unknown as ArgumentsHost;
  const filter = new ErrorResponseFilter({ httpAdapter: adapter } as unknown as HttpAdapterHost);

  const run = (exception: unknown) => {
    filter.catch(exception, host);
    const [, body, status] = (reply.mock.calls[0] ?? []) as [unknown, ErrorResponse, number];
    return { body, status };
  };
  return { run, reply };
}

describe("ErrorResponseFilter", () => {
  let logError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logError = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("domain errors", () => {
    it.each([
      [new TestInvalidValueError(), 400, "BAD_VALUE"],
      [new TestAuthenticationError(), 401, "BAD_CREDENTIALS"],
      [new TestForbiddenActionError(), 403, "NOT_ALLOWED"],
      [new TestEntityNotFoundError(), 404, "THING_NOT_FOUND"],
      [new TestConflictError(), 409, "THING_EXISTS"],
      [new TestBusinessRuleViolationError(), 422, "RULE_BROKEN"],
    ])("maps %o to %i with its own code", (error, status, code) => {
      const result = setup().run(error);

      expect(result.status).toBe(status);
      expect(result.body).toMatchObject({
        statusCode: status,
        code,
        message: error.message,
      });
      expect(result.body.details).toBeUndefined();
    });

    it("includes details of a request validation error", () => {
      const details = [{ field: "email", messages: ["must be an email"] }];
      const { body, status } = setup().run(new RequestValidationError(details));

      expect(status).toBe(400);
      expect(body).toMatchObject({ code: "VALIDATION_FAILED", details });
    });

    it("does not expose a details property of other domain errors", () => {
      const { body } = setup().run(new TestUnrelatedDetailsError());

      expect(body.details).toBeUndefined();
    });
  });

  describe("PostgreSQL errors", () => {
    // Literal texts on purpose: they are user-facing copy, so a change must be deliberate
    it.each([
      [
        "23505",
        409,
        "UNIQUE_VIOLATION",
        "Ya existe un registro con estos datos. Revisá la información e intentá de nuevo.",
      ],
      [
        "23503",
        409,
        "FOREIGN_KEY_VIOLATION",
        "No se pudo completar la operación porque hace referencia a datos que no existen o que todavía se están usando en otro lugar.",
      ],
      [
        "23514",
        422,
        "CHECK_VIOLATION",
        "No se pudo completar la operación porque no cumple con las reglas del sistema.",
      ],
    ])("maps SQLSTATE %s to %i", (sqlState, status, code, message) => {
      const direct = setup().run(pgError(sqlState));
      const wrapped = setup().run(drizzleError(sqlState));

      for (const result of [direct, wrapped]) {
        expect(result.status).toBe(status);
        expect(result.body).toMatchObject({ statusCode: status, code, message });
        expect(JSON.stringify(result.body)).not.toMatch(/users|constraint|insert|duplicate/i);
      }
    });

    it.each(["22012", "23502"])(
      "maps unmapped SQLSTATE %s to a 500 without details",
      (sqlState) => {
        const direct = setup().run(pgError(sqlState));
        const wrapped = setup().run(drizzleError(sqlState));

        for (const result of [direct, wrapped]) {
          expect(result.status).toBe(500);
          expect(result.body).toMatchObject({
            statusCode: 500,
            code: "INTERNAL_ERROR",
            message: "Internal server error",
          });
          expect(JSON.stringify(result.body)).not.toMatch(/users|constraint|insert|duplicate/i);
        }
        expect(logError).toHaveBeenCalledTimes(2);
      },
    );
  });

  describe("HttpException", () => {
    it.each([
      [new BadRequestException("bad"), 400, "BAD_REQUEST"],
      [new UnauthorizedException("no"), 401, "UNAUTHORIZED"],
      [new ForbiddenException("nope"), 403, "FORBIDDEN"],
      [new NotFoundException("missing"), 404, "NOT_FOUND"],
      [new ConflictException("dup"), 409, "CONFLICT"],
      [new HttpException("bad entity", 422), 422, "UNPROCESSABLE_ENTITY"],
      [new HttpException("slow down", 429), 429, "TOO_MANY_REQUESTS"],
      [new HttpException("too big", 413), 413, "PAYLOAD_TOO_LARGE"],
      [new HttpException("wrong type", 415), 415, "UNSUPPORTED_MEDIA_TYPE"],
      [new HttpException("teapot", 418), 418, "HTTP_ERROR"],
    ])("keeps the status of %o", (error, status, code) => {
      const result = setup().run(error);

      expect(result.status).toBe(status);
      expect(result.body).toMatchObject({ statusCode: status, code, message: error.message });
      expect(logError).not.toHaveBeenCalled();
    });

    it("normalizes a 503 and hides its message", () => {
      const { body, status } = setup().run(
        new ServiceUnavailableException({ status: "error", database: "down" }),
      );

      expect(status).toBe(503);
      expect(body.code).toBe("SERVICE_UNAVAILABLE");
      expect(body.message).toBe("Internal server error");
      expect(JSON.stringify(body)).not.toContain("database");
    });
  });

  describe("unknown errors", () => {
    it.each([[new Error("secret failure")], ["a thrown string"], [null], [{ reason: "object" }]])(
      "maps %o to a generic 500",
      (error) => {
        const { body, status } = setup().run(error);

        expect(status).toBe(500);
        expect(body).toMatchObject({
          statusCode: 500,
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        });
        expect(JSON.stringify(body)).not.toMatch(/secret|string|object/);
      },
    );

    it("logs 5xx errors with their stack", () => {
      const error = new Error("secret failure");
      setup().run(error);

      expect(logError).toHaveBeenCalledWith("secret failure", error.stack);
    });
  });

  describe("response envelope", () => {
    it("adds path without query string and an ISO timestamp", () => {
      const { body } = setup({ url: "/api/v1/things?token=secret" }).run(new TestConflictError());

      expect(body.path).toBe("/api/v1/things");
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });

    it("does not log 4xx errors", () => {
      setup().run(new TestEntityNotFoundError());

      expect(logError).not.toHaveBeenCalled();
    });

    it("does not reply when headers were already sent", () => {
      const { reply, run } = setup({ headersSent: true });

      run(new Error("late"));

      expect(reply).not.toHaveBeenCalled();
    });
  });
});
