import { Controller, Get, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AppModule } from "./../src/app.module.js";
import { setupApp } from "./../src/app.setup.js";
import type { Env } from "./../src/config/env.js";
import { AccessTokenService } from "./../src/modules/identity/application/ports/access-token-service.js";
import { UserRepository } from "./../src/modules/identity/domain/repositories/user.repository.js";
import { UserRole } from "./../src/modules/identity/domain/user-role.js";
import { Roles } from "./../src/modules/identity/presentation/decorators/roles.decorator.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { adminPool, insertUser, truncateAll } from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

@Controller("account-probe")
class AccountProbeController {
  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @Get("any-role")
  anyRole() {
    return { ok: true };
  }

  @Roles(UserRole.ADMIN)
  @Get("admin")
  admin() {
    return { ok: true };
  }
}

const ERROR_KEYS = ["code", "message", "path", "statusCode", "timestamp"];
const ERRORS = {
  unauthenticated: {
    statusCode: 401,
    code: "INVALID_ACCESS_TOKEN",
    message: "Tu sesión no es válida o venció. Iniciá sesión de nuevo.",
  },
  passwordChangeRequired: {
    statusCode: 403,
    code: "PASSWORD_CHANGE_REQUIRED",
    message: "Tenés que cambiar tu contraseña antes de continuar.",
  },
  originNotAllowed: {
    statusCode: 403,
    code: "ORIGIN_NOT_ALLOWED",
    message: "No se pudo verificar el origen de la solicitud.",
  },
  notImplemented: {
    statusCode: 501,
    code: "NOT_IMPLEMENTED",
    message: "Esta función todavía no está disponible.",
  },
} as const;

type Expected = (typeof ERRORS)[keyof typeof ERRORS];

describe("Authentication routes (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let frontendOrigin: string;
  let ids: { pending: string; ready: string };
  let tokens: { pending: string; ready: string };

  const issueFor = async (id: string) => {
    const user = await app.get(UserRepository, { strict: false }).findById(id);
    if (!user) throw new Error(`User ${id} not found`);
    return app.get(AccessTokenService).issue(user).token;
  };
  const withToken = (pending: request.Test, token?: string) =>
    token === undefined ? pending : pending.set("Authorization", `Bearer ${token}`);
  const expectError = async (pending: request.Test, expected: Expected) => {
    const body = (await pending.expect(expected.statusCode)).body as ErrorResponse;
    expect(body).toMatchObject(expected);
    expect(Object.keys(body).sort()).toEqual(ERROR_KEYS);
    expect(JSON.stringify(body)).not.toMatch(/example\.com|[0-9a-f]{8}-[0-9a-f]{4}-|localhost/i);
  };

  const accountRoutes = [
    ["POST", "/api/v1/auth/change-password"],
    ["GET", "/api/v1/auth/me"],
  ] as const;
  const cookieRoutes = ["/api/v1/auth/refresh", "/api/v1/auth/logout"] as const;
  const call = (method: "GET" | "POST", path: string) =>
    method === "GET" ? http.get(path) : http.post(path);

  beforeAll(async () => {
    pool = adminPool();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [AccountProbeController],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    setupApp(app);
    await app.init();
    http = request(app.getHttpServer());
    frontendOrigin = new URL(app.get(ConfigService<Env, true>).get("FRONTEND_URL", { infer: true }))
      .origin;
  });

  beforeEach(async () => {
    await truncateAll(pool);
    ids = {
      pending: await insertUser(pool, { role: "SELLER", mustChangePassword: true }),
      ready: await insertUser(pool, { role: "SELLER", mustChangePassword: false }),
    };
    tokens = { pending: await issueFor(ids.pending), ready: await issueFor(ids.ready) };
  });

  afterAll(async () => {
    await truncateAll(pool);
    await app.close();
    await pool.end();
  });

  describe("pending password change", () => {
    it.each(accountRoutes)(
      "%s %s lets a user with a pending change through",
      async (method, path) => {
        await expectError(withToken(call(method, path), tokens.pending), ERRORS.notImplemented);
      },
    );

    it("blocks a user with a pending change everywhere else", async () => {
      await expectError(
        withToken(http.get("/api/v1/account-probe/any-role"), tokens.pending),
        ERRORS.passwordChangeRequired,
      );
    });

    it("does not affect a user without a pending change", async () => {
      await withToken(http.get("/api/v1/account-probe/any-role"), tokens.ready).expect(200);
    });

    it("checks the pending change before the role", async () => {
      await expectError(
        withToken(http.get("/api/v1/account-probe/admin"), tokens.pending),
        ERRORS.passwordChangeRequired,
      );
    });

    it("checks the token before the pending change", async () => {
      await expectError(http.get("/api/v1/auth/me"), ERRORS.unauthenticated);
    });

    it("applies a completed change without a new token", async () => {
      await pool.query("UPDATE libreria.users SET must_change_password = false WHERE id = $1", [
        ids.pending,
      ]);

      await withToken(http.get("/api/v1/account-probe/any-role"), tokens.pending).expect(200);
    });

    it.each(accountRoutes)("%s %s does not require an Origin", async (method, path) => {
      await expectError(withToken(call(method, path), tokens.ready), ERRORS.notImplemented);
    });
  });

  describe("cookie routes", () => {
    it.each(cookieRoutes)("%s passes without a token from the frontend origin", async (path) => {
      await expectError(http.post(path).set("Origin", frontendOrigin), ERRORS.notImplemented);
    });

    it.each(cookieRoutes)("%s passes with a frontend Referer and no Origin", async (path) => {
      await expectError(
        http.post(path).set("Referer", `${frontendOrigin}/panel?page=1`),
        ERRORS.notImplemented,
      );
    });

    it.each(cookieRoutes)("%s allows the frontend origin in CORS", async (path) => {
      const response = await http.post(path).set("Origin", frontendOrigin);

      expect(response.headers["access-control-allow-origin"]).toBe(frontendOrigin);
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });

    it.each(cookieRoutes)("%s rejects a foreign origin", async (path) => {
      await expectError(
        http.post(path).set("Origin", "https://evil.example.org"),
        ERRORS.originNotAllowed,
      );
    });

    it.each(cookieRoutes)("%s rejects a foreign Referer and no Origin", async (path) => {
      await expectError(
        http.post(path).set("Referer", "https://evil.example.org/page"),
        ERRORS.originNotAllowed,
      );
    });

    it.each(cookieRoutes)("%s rejects a request without Origin or Referer", async (path) => {
      await expectError(http.post(path), ERRORS.originNotAllowed);
    });

    it.each(cookieRoutes)("%s rejects a foreign origin even with a valid token", async (path) => {
      await expectError(
        withToken(http.post(path).set("Origin", "https://evil.example.org"), tokens.ready),
        ERRORS.originNotAllowed,
      );
    });
  });
});
