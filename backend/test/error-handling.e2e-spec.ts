import { Body, Controller, Get, Post } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { IsEmail } from "class-validator";
import { sql } from "drizzle-orm";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AppModule } from "./../src/app.module.js";
import { setupApp } from "./../src/app.setup.js";
import { DatabaseHealthCheck } from "./../src/shared/application/database-health-check.js";
import {
  AuthenticationError,
  BusinessRuleViolationError,
  ConflictError,
  EntityNotFoundError,
  ForbiddenActionError,
  InvalidValueError,
} from "./../src/shared/domain/errors/index.js";
import { DATABASE_ERROR_MESSAGES } from "./../src/shared/presentation/filters/error-response.filter.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { DrizzleClient } from "./../src/shared/infrastructure/database/drizzle.client.js";

type ProbeTransaction = Parameters<Parameters<DrizzleClient["db"]["transaction"]>[0]>[0];

class ProbeInvalidValueError extends InvalidValueError {
  constructor() {
    super("PROBE_INVALID", "Invalid probe value");
  }
}
class ProbeAuthenticationError extends AuthenticationError {
  constructor() {
    super("PROBE_UNAUTHENTICATED", "Probe not authenticated");
  }
}
class ProbeForbiddenActionError extends ForbiddenActionError {
  constructor() {
    super("PROBE_FORBIDDEN", "Probe forbidden");
  }
}
class ProbeEntityNotFoundError extends EntityNotFoundError {
  constructor() {
    super("PROBE_NOT_FOUND", "Probe not found");
  }
}
class ProbeConflictError extends ConflictError {
  constructor() {
    super("PROBE_CONFLICT", "Probe conflict");
  }
}
class ProbeBusinessRuleViolationError extends BusinessRuleViolationError {
  constructor() {
    super("PROBE_RULE", "Probe rule violated");
  }
}

class ProbeDto {
  @IsEmail()
  email!: string;
}

@Controller("error-probe")
class ErrorProbeController {
  constructor(private readonly drizzle: DrizzleClient) {}

  @Get("invalid")
  invalid() {
    throw new ProbeInvalidValueError();
  }
  @Get("unauthenticated")
  unauthenticated() {
    throw new ProbeAuthenticationError();
  }
  @Get("forbidden")
  forbidden() {
    throw new ProbeForbiddenActionError();
  }
  @Get("not-found")
  notFound() {
    throw new ProbeEntityNotFoundError();
  }
  @Get("conflict")
  conflict() {
    throw new ProbeConflictError();
  }
  @Get("rule")
  rule() {
    throw new ProbeBusinessRuleViolationError();
  }
  @Get("unexpected")
  unexpected() {
    throw new Error("sensitive internal detail");
  }

  @Post("validate")
  validate(@Body() dto: ProbeDto) {
    return dto;
  }

  /** Runs statements expected to fail; if they succeed, it throws so nothing is ever committed. */
  private expectingFailure(work: (tx: ProbeTransaction) => Promise<unknown>) {
    return this.drizzle.db.transaction(async (tx) => {
      await work(tx);
      throw new Error("The probe statements did not fail");
    });
  }

  @Get("unique-violation")
  uniqueViolation() {
    return this.expectingFailure(async (tx) => {
      const insert = (name: string) =>
        tx.execute(
          sql`INSERT INTO libreria.categories (name, slug) VALUES (${name}, 'probe-slug')`,
        );
      await insert("Probe one");
      await insert("Probe two");
    });
  }

  @Get("check-violation")
  checkViolation() {
    return this.expectingFailure((tx) =>
      tx.execute(
        sql`INSERT INTO libreria.categories (name, slug) VALUES ('Probe check', 'Not A Slug')`,
      ),
    );
  }

  @Get("foreign-key-violation")
  foreignKeyViolation() {
    return this.expectingFailure((tx) =>
      tx.execute(sql`
        INSERT INTO libreria.product_categories (product_id, category_id, is_primary)
        VALUES (gen_random_uuid(), gen_random_uuid(), true)
      `),
    );
  }

  @Get("immutable-column")
  immutableColumn() {
    return this.expectingFailure(async (tx) => {
      await tx.execute(
        sql`INSERT INTO libreria.categories (name, slug) VALUES ('Probe immutable', 'probe-immutable')`,
      );
      await tx.execute(
        sql`UPDATE libreria.categories SET slug = 'probe-changed' WHERE slug = 'probe-immutable'`,
      );
    });
  }

  @Get("last-admin-removal")
  lastAdminRemoval() {
    return this.expectingFailure(async (tx) => {
      await tx.execute(sql`
        INSERT INTO libreria.users (email, name, password_hash, role)
        VALUES ('probe-' || gen_random_uuid() || '@example.com', 'Probe admin', 'hash', 'ADMIN')
      `);
      // Row-level triggers see the rows already updated by the same statement, so the last one fails
      await tx.execute(sql`
        UPDATE libreria.users SET is_active = false
        WHERE role = 'ADMIN' AND is_active AND deleted_at IS NULL
      `);
    });
  }

  @Get("deferred-check-violation")
  deferredCheckViolation() {
    // The category and image constraint triggers are deferred, so the violation surfaces at COMMIT;
    // this probe needs the commit and cannot use expectingFailure. A random slug keeps a leftover
    // row from breaking later runs, and the suite removes any leftover afterwards.
    return this.drizzle.db.transaction((tx) =>
      tx.execute(sql`
        INSERT INTO libreria.products (title, slug, price)
        VALUES ('Probe deferred', 'probe-deferred-' || substr(md5(random()::text), 1, 8), 10)
      `),
    );
  }

  @Get("missing-required-value")
  missingRequiredValue() {
    return this.expectingFailure((tx) =>
      tx.execute(sql`INSERT INTO libreria.categories (name, slug) VALUES (NULL, 'probe-missing')`),
    );
  }

  @Get("unmapped-sql-error")
  unmappedSqlError() {
    return this.drizzle.db.execute(sql`SELECT 1 / 0`);
  }
}

async function bodyOf(test: request.Test): Promise<ErrorResponse> {
  return (await test).body as ErrorResponse;
}

const ERROR_KEYS = ["code", "message", "path", "statusCode", "timestamp"];

async function createApp(
  configure: (builder: ReturnType<typeof Test.createTestingModule>) => void = () => undefined,
): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({
    imports: [AppModule],
    controllers: [ErrorProbeController],
  });
  configure(builder);
  const app = (await builder.compile()).createNestApplication<INestApplication<App>>();
  setupApp(app);
  await app.init();
  return app;
}

describe("Error handling (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app
      .get(DrizzleClient)
      .db.execute(sql`DELETE FROM libreria.products WHERE slug LIKE 'probe-deferred-%'`);
    await app.close();
  });

  it.each([
    ["invalid", 400, "PROBE_INVALID"],
    ["unauthenticated", 401, "PROBE_UNAUTHENTICATED"],
    ["forbidden", 403, "PROBE_FORBIDDEN"],
    ["not-found", 404, "PROBE_NOT_FOUND"],
    ["conflict", 409, "PROBE_CONFLICT"],
    ["rule", 422, "PROBE_RULE"],
  ])("maps the %s domain error to %i", async (route, status, code) => {
    const body = await bodyOf(http.get(`/api/v1/error-probe/${route}`).expect(status));

    expect(body).toMatchObject({
      statusCode: status,
      code,
      path: `/api/v1/error-probe/${route}`,
    });
    expect(Object.keys(body).sort()).toEqual(ERROR_KEYS);
  });

  it("answers an unexpected error with a 500 and no details", async () => {
    const body = await bodyOf(http.get("/api/v1/error-probe/unexpected").expect(500));

    expect(body).toMatchObject({ code: "INTERNAL_ERROR", message: "Internal server error" });
    expect(JSON.stringify(body)).not.toContain("sensitive");
    expect(Object.keys(body).sort()).toEqual(ERROR_KEYS);
  });

  it("answers an unknown route with the uniform 404 format", async () => {
    const body = await bodyOf(http.get("/api/v1/does-not-exist").expect(404));

    expect(body).toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
    expect(Object.keys(body).sort()).toEqual(ERROR_KEYS);
  });

  it("answers an invalid body with field details", async () => {
    const body = await bodyOf(
      http.post("/api/v1/error-probe/validate").send({ email: "nope", extra: 1 }).expect(400),
    );

    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.details).toEqual(
      expect.arrayContaining([
        { field: "email", messages: ["email must be an email"] },
        { field: "extra", messages: ["property extra should not exist"] },
      ]),
    );
  });

  it("answers a malformed JSON body with a 400", async () => {
    const body = await bodyOf(
      http
        .post("/api/v1/error-probe/validate")
        .set("Content-Type", "application/json")
        .send('{"email": ')
        .expect(400),
    );

    expect(body.statusCode).toBe(400);
    expect(Object.keys(body).sort()).toEqual(ERROR_KEYS);
  });

  describe("PostgreSQL errors", () => {
    // Identifiers and texts that only the database produces: tables, constraints, SQL, RAISE messages, ids
    const leaks =
      /\b(categories|product_categories|products|product_images|users)\b|\b(uq|chk|fk|pk)_|\b(INSERT|UPDATE|SELECT|COMMIT)\b|constraint|immutable|administrator|must have|probe-|[0-9a-f]{8}-[0-9a-f]{4}-/i;
    // The path echoes the probe route, which is not data coming from the database
    const exposed = (body: ErrorResponse) => JSON.stringify({ ...body, path: undefined });

    it.each([
      ["unique-violation", 409, "UNIQUE_VIOLATION"],
      ["foreign-key-violation", 409, "FOREIGN_KEY_VIOLATION"],
      ["check-violation", 422, "CHECK_VIOLATION"],
      ["immutable-column", 422, "CHECK_VIOLATION"],
      ["last-admin-removal", 422, "CHECK_VIOLATION"],
      ["deferred-check-violation", 422, "CHECK_VIOLATION"],
    ] as const)("maps a real %s to %i", async (route, status, code) => {
      const body = await bodyOf(http.get(`/api/v1/error-probe/${route}`).expect(status));

      expect(body).toMatchObject({
        statusCode: status,
        code,
        message: DATABASE_ERROR_MESSAGES[code],
      });
      expect(exposed(body)).not.toMatch(leaks);
      expect(Object.keys(body).sort()).toEqual(ERROR_KEYS);
    });

    it("answers an unmapped SQL error with a 500 and no details", async () => {
      const body = await bodyOf(http.get("/api/v1/error-probe/unmapped-sql-error").expect(500));

      expect(body).toMatchObject({
        statusCode: 500,
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      });
      expect(exposed(body)).not.toMatch(/division/i);
      expect(exposed(body)).not.toMatch(leaks);
      expect(Object.keys(body).sort()).toEqual(ERROR_KEYS);
    });

    it("answers an unmapped integrity violation with a 500 and no details", async () => {
      const body = await bodyOf(http.get("/api/v1/error-probe/missing-required-value").expect(500));

      expect(body).toMatchObject({
        statusCode: 500,
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      });
      expect(exposed(body)).not.toMatch(/null|\bname\b/i);
      expect(exposed(body)).not.toMatch(leaks);
      expect(Object.keys(body).sort()).toEqual(ERROR_KEYS);
    });
  });
});

describe("Error handling of the readiness probe (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createApp((builder) =>
      builder
        .overrideProvider(DatabaseHealthCheck)
        .useValue({ isReachable: () => Promise.resolve(false) }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 503 with the uniform format", async () => {
    const body = await bodyOf(request(app.getHttpServer()).get("/api/v1/health/ready").expect(503));

    expect(body).toMatchObject({ statusCode: 503, code: "SERVICE_UNAVAILABLE" });
    expect(Object.keys(body).sort()).toEqual(ERROR_KEYS);
  });
});
