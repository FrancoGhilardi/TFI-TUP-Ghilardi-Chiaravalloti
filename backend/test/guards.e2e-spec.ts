import { Controller, Get, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
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
import type { AuthUser } from "./../src/modules/identity/presentation/auth-user.js";
import { CurrentUser } from "./../src/modules/identity/presentation/decorators/current-user.decorator.js";
import { Public } from "./../src/modules/identity/presentation/decorators/public.decorator.js";
import { Roles } from "./../src/modules/identity/presentation/decorators/roles.decorator.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { adminPool, insertUser, truncateAll } from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

@Controller("guard-probe")
class GuardProbeController {
  @Public()
  @Get("public")
  open() {
    return { ok: true };
  }

  @Get("unannotated")
  unannotated() {
    return { ok: true };
  }

  @Roles(UserRole.ADMIN)
  @Get("admin")
  admin() {
    return { ok: true };
  }

  @Roles(UserRole.ADMIN, UserRole.SELLER)
  @Get("any-role")
  anyRole(@CurrentUser() user: AuthUser) {
    return user;
  }
}

const UNAUTHENTICATED = {
  statusCode: 401,
  code: "INVALID_ACCESS_TOKEN",
  message: "Tu sesión no es válida o venció. Iniciá sesión de nuevo.",
};
const FORBIDDEN = {
  statusCode: 403,
  code: "INSUFFICIENT_ROLE",
  message: "No tenés permiso para realizar esta acción.",
};
const ERROR_KEYS = ["code", "message", "path", "statusCode", "timestamp"];

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const nowInSeconds = () => Math.floor(Date.now() / 1000);

describe("Global guards (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let secret: string;
  let ids: { admin: string; otherAdmin: string; seller: string };
  let tokens: { admin: string; seller: string };

  const issueFor = async (id: string) => {
    const user = await app.get(UserRepository, { strict: false }).findById(id);
    if (!user) throw new Error(`User ${id} not found`);
    return app.get(AccessTokenService).issue(user).token;
  };
  const sign = (
    payload: object,
    options: { secret?: string; algorithm?: "HS256" | "HS512" } = {},
  ) =>
    new JwtService().sign(payload as Record<string, unknown>, {
      secret: options.secret ?? secret,
      algorithm: options.algorithm ?? "HS256",
    });
  const get = (path: string, token?: string) => {
    const pending = http.get(`/api/v1/${path}`);
    return token === undefined ? pending : pending.set("Authorization", `Bearer ${token}`);
  };
  const expectError = async (
    pending: request.Test,
    expected: typeof UNAUTHENTICATED | typeof FORBIDDEN,
  ) => {
    const body = (await pending.expect(expected.statusCode)).body as ErrorResponse;
    expect(body).toMatchObject(expected);
    expect(Object.keys(body).sort()).toEqual(ERROR_KEYS);
    expect(JSON.stringify(body)).not.toMatch(/example\.com|[0-9a-f]{8}-[0-9a-f]{4}-|jwt|passport/i);
  };

  beforeAll(async () => {
    pool = adminPool();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [GuardProbeController],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    setupApp(app);
    await app.init();
    http = request(app.getHttpServer());
    secret = app.get(ConfigService<Env, true>).get("JWT_ACCESS_SECRET", { infer: true });
  });

  beforeEach(async () => {
    await truncateAll(pool);
    ids = {
      admin: await insertUser(pool, { role: "ADMIN", mustChangePassword: false }),
      // A second admin lets the tests demote or remove the first one.
      otherAdmin: await insertUser(pool, { role: "ADMIN", mustChangePassword: false }),
      seller: await insertUser(pool, { role: "SELLER", mustChangePassword: false }),
    };
    tokens = { admin: await issueFor(ids.admin), seller: await issueFor(ids.seller) };
  });

  afterAll(async () => {
    await truncateAll(pool);
    await app.close();
    await pool.end();
  });

  describe("access matrix", () => {
    type Caller = "none" | "invalid" | "seller" | "admin";
    const tokenOf = (caller: Caller) =>
      caller === "none" ? undefined : caller === "invalid" ? "not-a-token" : tokens[caller];

    it.each([
      ["public", "none", 200],
      ["public", "invalid", 200],
      ["public", "seller", 200],
      ["public", "admin", 200],
      ["unannotated", "none", 401],
      ["unannotated", "invalid", 401],
      ["unannotated", "seller", 403],
      ["unannotated", "admin", 403],
      ["admin", "none", 401],
      ["admin", "invalid", 401],
      ["admin", "seller", 403],
      ["admin", "admin", 200],
      ["any-role", "none", 401],
      ["any-role", "invalid", 401],
      ["any-role", "seller", 200],
      ["any-role", "admin", 200],
    ] as const)("%s called by %s answers %i", async (route, caller, status) => {
      const pending = get(`guard-probe/${route}`, tokenOf(caller));

      if (status === 401) await expectError(pending, UNAUTHENTICATED);
      else if (status === 403) await expectError(pending, FORBIDDEN);
      else await pending.expect(200);
    });
  });

  it("checks the token before the role", async () => {
    await expectError(get("guard-probe/admin"), UNAUTHENTICATED);
  });

  describe("health endpoints", () => {
    it.each(["health", "health/ready"])("%s answers without a token", async (path) => {
      await get(path).expect(200);
    });

    it.each(["health", "health/ready"])("%s ignores an invalid token", async (path) => {
      await get(path, "not-a-token").expect(200);
    });
  });

  it("answers an unknown route with a 404, not a 401", async () => {
    await http.get("/api/v1/does-not-exist").expect(404);
  });

  it("injects the current user, read from the database", async () => {
    const body = (await get("guard-probe/any-role", tokens.seller).expect(200)).body as AuthUser;

    expect(body).toEqual({
      id: ids.seller,
      email: expect.stringMatching(/@example\.com$/) as string,
      name: "Test user",
      role: "SELLER",
      mustChangePassword: false,
    });
  });

  describe("invalid tokens", () => {
    it("rejects an expired token", async () => {
      const iat = nowInSeconds() - 120;
      await expectError(
        get("guard-probe/any-role", sign({ sub: ids.admin, iat, exp: iat + 60 })),
        UNAUTHENTICATED,
      );
    });

    it("rejects a token signed with another secret", async () => {
      await expectError(
        get("guard-probe/any-role", sign({ sub: ids.admin }, { secret: `${secret}-other` })),
        UNAUTHENTICATED,
      );
    });

    it("rejects a token signed with another algorithm", async () => {
      await expectError(
        get("guard-probe/any-role", sign({ sub: ids.admin }, { algorithm: "HS512" })),
        UNAUTHENTICATED,
      );
    });

    it("rejects an unsigned token", async () => {
      const unsigned = `${base64url({ alg: "none", typ: "JWT" })}.${base64url({
        sub: ids.admin,
        iat: nowInSeconds(),
      })}.`;
      await expectError(get("guard-probe/any-role", unsigned), UNAUTHENTICATED);
    });

    it("rejects a malformed token", async () => {
      await expectError(get("guard-probe/any-role", "a.b.c"), UNAUTHENTICATED);
    });

    it("rejects a token without the Bearer prefix", async () => {
      await expectError(
        http.get("/api/v1/guard-probe/any-role").set("Authorization", tokens.admin),
        UNAUTHENTICATED,
      );
    });

    it("rejects a token whose subject is not a user id", async () => {
      await expectError(get("guard-probe/any-role", sign({ sub: "abc" })), UNAUTHENTICATED);
    });

    it("rejects a token without a subject", async () => {
      await expectError(get("guard-probe/any-role", sign({ foo: "bar" })), UNAUTHENTICATED);
    });
  });

  describe("user state", () => {
    it("rejects a token of a user that does not exist", async () => {
      const token = sign({ sub: "00000000-0000-4000-8000-000000000000" });
      await expectError(get("guard-probe/any-role", token), UNAUTHENTICATED);
    });

    it("rejects a token of a deleted user", async () => {
      await pool.query(
        "UPDATE libreria.users SET deleted_at = now(), is_active = false WHERE id = $1",
        [ids.seller],
      );
      await expectError(get("guard-probe/any-role", tokens.seller), UNAUTHENTICATED);
    });

    it("rejects a token of an inactive user", async () => {
      await pool.query("UPDATE libreria.users SET is_active = false WHERE id = $1", [ids.seller]);
      await expectError(get("guard-probe/any-role", tokens.seller), UNAUTHENTICATED);
    });

    it("rejects a token issued before the last password change", async () => {
      const token = sign({ sub: ids.seller, iat: nowInSeconds() - 60 });
      await pool.query("UPDATE libreria.users SET password_hash = 'new-hash' WHERE id = $1", [
        ids.seller,
      ]);
      await expectError(get("guard-probe/any-role", token), UNAUTHENTICATED);
    });

    it("accepts a token issued after the last password change", async () => {
      await pool.query("UPDATE libreria.users SET password_hash = 'new-hash' WHERE id = $1", [
        ids.seller,
      ]);
      await get("guard-probe/any-role", await issueFor(ids.seller)).expect(200);
    });

    it("applies a role change without a new token", async () => {
      await get("guard-probe/admin", tokens.admin).expect(200);
      await pool.query("UPDATE libreria.users SET role = 'SELLER' WHERE id = $1", [ids.admin]);

      await expectError(get("guard-probe/admin", tokens.admin), FORBIDDEN);
      const body = (await get("guard-probe/any-role", tokens.admin).expect(200)).body as AuthUser;
      expect(body.role).toBe("SELLER");
    });
  });
});
