import type { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Env } from "../../../../config/env.js";
import { User } from "../../domain/entities/user.js";
import { UserRole } from "../../domain/user-role.js";
import { Email } from "../../domain/value-objects/email.js";
import { JwtAccessTokenService } from "./jwt-access-token.service.js";

const SECRET = "a-secret-that-is-long-enough-for-hs256";
const TTL = 900;

const user = User.reconstitute({
  id: "4f9c1f43-6f4b-4d5c-9a3e-5b2d8c7a1e10",
  email: Email.create("ana@example.com"),
  name: "Ana",
  passwordHash: "hash",
  role: UserRole.ADMIN,
  active: true,
  mustChangePassword: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

function service() {
  const values: Partial<Env> = { JWT_ACCESS_SECRET: SECRET, JWT_ACCESS_TTL_SECONDS: TTL };
  const config = { get: (key: keyof Env) => values[key] } as ConfigService<Env, true>;
  return new JwtAccessTokenService(new JwtService(), config);
}

function decodeHeader(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString()) as Record<
    string,
    unknown
  >;
}

describe("JwtAccessTokenService", () => {
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

  it("signs with HS256", () => {
    expect(decodeHeader(service().issue(user).token)).toEqual({ alg: "HS256", typ: "JWT" });
  });

  it("cannot be verified with another secret", () => {
    const { token } = service().issue(user);

    expect(() =>
      new JwtService().verify<Record<string, unknown>>(token, { secret: `${SECRET}-other` }),
    ).toThrow();
  });
});
