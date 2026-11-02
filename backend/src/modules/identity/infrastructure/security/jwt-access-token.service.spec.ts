import type { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Env } from "../../../../config/env.js";
import { InvalidAccessTokenError } from "../../application/errors/invalid-access-token-error.js";
import { User } from "../../domain/entities/user.js";
import { UserRole } from "../../domain/user-role.js";
import { Email } from "../../domain/value-objects/email.js";
import { JwtAccessTokenService } from "./jwt-access-token.service.js";

const SECRET = "a-secret-that-is-long-enough-for-hs256";
const TTL = 900;
const USER_ID = "4f9c1f43-6f4b-4d5c-9a3e-5b2d8c7a1e10";

const user = User.reconstitute({
  id: USER_ID,
  email: Email.create("ana@example.com"),
  name: "Ana",
  passwordHash: "hash",
  role: UserRole.ADMIN,
  active: true,
  mustChangePassword: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

function service(ttl = TTL) {
  const values: Partial<Env> = { JWT_ACCESS_SECRET: SECRET, JWT_ACCESS_TTL_SECONDS: ttl };
  const config = { get: (key: keyof Env) => values[key] } as ConfigService<Env, true>;
  return new JwtAccessTokenService(new JwtService(), config);
}

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

function decodeHeader(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString()) as Record<
    string,
    unknown
  >;
}

/** Signs an arbitrary payload, bypassing the service, to build tokens it would never issue. */
function sign(
  payload: Record<string, unknown>,
  options: { secret?: string; algorithm?: "HS256" | "HS512"; noTimestamp?: boolean } = {},
) {
  return new JwtService().sign(payload, {
    secret: options.secret ?? SECRET,
    algorithm: options.algorithm ?? "HS256",
    noTimestamp: options.noTimestamp ?? false,
  });
}

describe("JwtAccessTokenService", () => {
  describe("issue", () => {
    it("returns the token lifetime from the configuration", () => {
      expect(service().issue(user).expiresInSeconds).toBe(TTL);
    });

    it("signs a token carrying only the user id, its issue time and its expiry", () => {
      const { token } = service().issue(user);
      const payload = new JwtService().verify<Record<string, unknown>>(token, { secret: SECRET });

      expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "sub"]);
      expect(payload.sub).toBe(user.getId());
      expect(payload.exp).toBe((payload.iat as number) + TTL);
    });

    it.each([60, 3600])("applies a configured lifetime of %i seconds", (ttl) => {
      const issued = service(ttl).issue(user);
      const payload = new JwtService().verify<{ iat: number; exp: number }>(issued.token, {
        secret: SECRET,
      });

      expect(issued.expiresInSeconds).toBe(ttl);
      expect(payload.exp - payload.iat).toBe(ttl);
    });

    it("signs with HS256", () => {
      expect(decodeHeader(service().issue(user).token)).toEqual({ alg: "HS256", typ: "JWT" });
    });
  });

  describe("verify", () => {
    const rejects = (token: string) =>
      expect(() => service().verify(token)).toThrow(InvalidAccessTokenError);

    it("returns the user id and the issue time of a token it issued", () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-20T12:00:00.000Z"));
      try {
        const { token } = service().issue(user);

        expect(service().verify(token)).toEqual({
          userId: USER_ID,
          issuedAt: new Date("2026-10-20T12:00:00.000Z"),
        });
      } finally {
        vi.useRealTimers();
      }
    });

    describe("expiry", () => {
      beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-10-20T12:00:00.000Z"));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("accepts a token one second before it expires", () => {
        const { token } = service(60).issue(user);

        vi.advanceTimersByTime(59_000);
        expect(service(60).verify(token).userId).toBe(USER_ID);
      });

      it("rejects a token exactly when it expires", () => {
        const { token } = service(60).issue(user);

        vi.advanceTimersByTime(60_000);
        rejects(token);
      });

      it("rejects a token long after it expired", () => {
        const { token } = service(60).issue(user);

        vi.advanceTimersByTime(24 * 60 * 60_000);
        rejects(token);
      });
    });

    describe("invalid tokens", () => {
      const valid = () => service().issue(user).token;

      it("rejects a token signed with another secret", () => {
        rejects(sign({ sub: USER_ID, exp: 9_999_999_999 }, { secret: `${SECRET}-other` }));
      });

      it("rejects a token signed with another algorithm", () => {
        rejects(sign({ sub: USER_ID, exp: 9_999_999_999 }, { algorithm: "HS512" }));
      });

      it("rejects an unsigned token", () => {
        const now = Math.floor(Date.now() / 1000);
        rejects(
          `${base64url({ alg: "none", typ: "JWT" })}.${base64url({ sub: USER_ID, iat: now, exp: now + 60 })}.`,
        );
      });

      it("rejects a token whose signature was altered", () => {
        const [header, payload, signature] = valid().split(".");
        const altered = `${signature.slice(0, -2)}${signature.endsWith("AA") ? "BB" : "AA"}`;

        rejects(`${header}.${payload}.${altered}`);
      });

      it("rejects a token whose payload was altered", () => {
        const [header, , signature] = valid().split(".");
        const now = Math.floor(Date.now() / 1000);
        const payload = base64url({
          sub: "00000000-0000-4000-8000-000000000000",
          iat: now,
          exp: now + 60,
        });

        rejects(`${header}.${payload}.${signature}`);
      });

      it.each(["", "not-a-token", "a.b.c", valid().split(".").slice(0, 2).join(".")])(
        "rejects a malformed token %o",
        (token) => {
          rejects(token);
        },
      );

      it.each([
        ["without sub", { exp: 9_999_999_999 }],
        ["with a sub that is not a user id", { sub: "abc", exp: 9_999_999_999 }],
        ["with a numeric sub", { sub: 42, exp: 9_999_999_999 }],
        ["without exp", { sub: USER_ID }],
      ])("rejects a token %s", (_label, payload) => {
        rejects(sign(payload));
      });

      it("rejects a token without iat", () => {
        rejects(sign({ sub: USER_ID, exp: 9_999_999_999 }, { noTimestamp: true }));
      });

      it("rejects with the same code and message whatever the cause", () => {
        for (const token of ["", sign({ sub: "abc", exp: 9_999_999_999 })]) {
          expect(() => service().verify(token)).toThrow(
            expect.objectContaining({
              code: "INVALID_ACCESS_TOKEN",
              message: "Tu sesión no es válida o venció. Iniciá sesión de nuevo.",
            }),
          );
        }
      });
    });
  });
});
