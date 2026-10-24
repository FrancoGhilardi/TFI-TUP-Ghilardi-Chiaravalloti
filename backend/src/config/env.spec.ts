import { validateEnv } from "./env.js";

const LOCAL_URL = "postgresql://libreria_app:libreria_app@127.0.0.1:54322/postgres";
const SECRET = "a-secret-that-is-long-enough-for-hs256";
const BASE = { DATABASE_URL: LOCAL_URL, JWT_ACCESS_SECRET: SECRET };

describe("validateEnv", () => {
  it("fails without DATABASE_URL", () => {
    expect(() => validateEnv({})).toThrow("DATABASE_URL");
  });

  it("fails with an invalid DATABASE_URL", () => {
    expect(() => validateEnv({ DATABASE_URL: "nope" })).toThrow("DATABASE_URL");
  });

  it("rejects sslmode in DATABASE_URL", () => {
    expect(() => validateEnv({ DATABASE_URL: `${LOCAL_URL}?sslmode=require` })).toThrow(
      "SSL parameters",
    );
  });

  it("applies defaults for the local profile", () => {
    const env = validateEnv({ ...BASE });

    expect(env.DATABASE_SSL_MODE).toBe("disable");
    expect(env.DATABASE_POOL_MAX).toBe(10);
    expect(env.DATABASE_SSL_CA).toBeUndefined();
  });

  it("accepts the local pooler profile", () => {
    const env = validateEnv({
      DATABASE_URL: "postgresql://libreria_app.pooler-dev:libreria_app@127.0.0.1:54329/postgres",
      JWT_ACCESS_SECRET: SECRET,
    });

    expect(env.DATABASE_URL).toContain(":54329");
  });

  it("accepts the remote profile with verify-full and a CA", () => {
    const env = validateEnv({
      NODE_ENV: "production",
      DATABASE_URL:
        "postgresql://libreria_app.ref:pwd@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
      DATABASE_SSL_MODE: "verify-full",
      DATABASE_SSL_CA: "-----BEGIN CERTIFICATE-----",
      JWT_ACCESS_SECRET: SECRET,
      RESEND_API_KEY: "re_key",
      MAIL_FROM: "Librería Mi Sueño <no-reply@libreriamisueno.com.ar>",
    });

    expect(env.DATABASE_SSL_MODE).toBe("verify-full");
  });

  it("fails with verify-full and no CA", () => {
    expect(() => validateEnv({ ...BASE, DATABASE_SSL_MODE: "verify-full" })).toThrow(
      "DATABASE_SSL_CA",
    );
  });

  it("fails in production with SSL disabled", () => {
    expect(() => validateEnv({ NODE_ENV: "production", ...BASE })).toThrow(
      "SSL cannot be disabled in production",
    );
  });

  it("converts DATABASE_POOL_MAX from a string", () => {
    expect(validateEnv({ ...BASE, DATABASE_POOL_MAX: "20" }).DATABASE_POOL_MAX).toBe(20);
  });

  it("fails without JWT_ACCESS_SECRET", () => {
    expect(() => validateEnv({ DATABASE_URL: LOCAL_URL })).toThrow("JWT_ACCESS_SECRET");
  });

  it("fails with a JWT_ACCESS_SECRET shorter than 32 characters", () => {
    expect(() => validateEnv({ ...BASE, JWT_ACCESS_SECRET: "x".repeat(31) })).toThrow(
      "JWT_ACCESS_SECRET",
    );
  });

  it("accepts a JWT_ACCESS_SECRET of exactly 32 characters", () => {
    expect(
      validateEnv({ ...BASE, JWT_ACCESS_SECRET: "x".repeat(32) }).JWT_ACCESS_SECRET,
    ).toHaveLength(32);
  });

  it("defaults the access token lifetime to 15 minutes", () => {
    expect(validateEnv({ ...BASE }).JWT_ACCESS_TTL_SECONDS).toBe(900);
  });

  it("converts JWT_ACCESS_TTL_SECONDS from a string", () => {
    expect(validateEnv({ ...BASE, JWT_ACCESS_TTL_SECONDS: "120" }).JWT_ACCESS_TTL_SECONDS).toBe(
      120,
    );
  });

  it.each([
    ["one minute", "60", 60],
    ["one hour", "3600", 3600],
  ])("accepts an access token lifetime of %s", (_label, value, expected) => {
    expect(validateEnv({ ...BASE, JWT_ACCESS_TTL_SECONDS: value }).JWT_ACCESS_TTL_SECONDS).toBe(
      expected,
    );
  });

  it.each(["0", "-1", "1.5", "59", "3601"])("rejects JWT_ACCESS_TTL_SECONDS=%s", (value) => {
    expect(() => validateEnv({ ...BASE, JWT_ACCESS_TTL_SECONDS: value })).toThrow(
      "JWT_ACCESS_TTL_SECONDS",
    );
  });

  it("keeps a session for a week by default", () => {
    expect(validateEnv({ ...BASE }).REFRESH_TOKEN_TTL_DAYS).toBe(7);
  });

  it.each([
    ["one day", "1", 1],
    ["thirty days", "30", 30],
  ])("accepts a session lifetime of %s", (_label, value, expected) => {
    expect(validateEnv({ ...BASE, REFRESH_TOKEN_TTL_DAYS: value }).REFRESH_TOKEN_TTL_DAYS).toBe(
      expected,
    );
  });

  it.each(["0", "-1", "1.5", "31", "a week"])("rejects REFRESH_TOKEN_TTL_DAYS=%s", (value) => {
    expect(() => validateEnv({ ...BASE, REFRESH_TOKEN_TTL_DAYS: value })).toThrow(
      "REFRESH_TOKEN_TTL_DAYS",
    );
  });

  it("does not trust any proxy by default", () => {
    expect(validateEnv({ ...BASE }).TRUST_PROXY).toBe(0);
  });

  it("converts TRUST_PROXY from a string", () => {
    expect(validateEnv({ ...BASE, TRUST_PROXY: "1" }).TRUST_PROXY).toBe(1);
  });

  it.each(["-1", "1.5", "yes"])("rejects TRUST_PROXY=%s", (value) => {
    expect(() => validateEnv({ ...BASE, TRUST_PROXY: value })).toThrow("TRUST_PROXY");
  });

  it("allows the development secret outside production", () => {
    const secret = "dev-only-access-token-secret-change-me";

    expect(validateEnv({ ...BASE, JWT_ACCESS_SECRET: secret }).JWT_ACCESS_SECRET).toBe(secret);
  });

  it("rejects the development secret in production", () => {
    expect(() =>
      validateEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://libreria_app.ref:pwd@db.example.com:5432/postgres",
        DATABASE_SSL_MODE: "require",
        JWT_ACCESS_SECRET: "dev-only-access-token-secret-change-me",
      }),
    ).toThrow("The development secret cannot be used in production");
  });

  it("does not need Resend outside production, and takes a blank value as not set", () => {
    const env = validateEnv({ ...BASE, RESEND_API_KEY: "", MAIL_FROM: "  " });

    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.MAIL_FROM).toBeUndefined();
  });

  it.each(["RESEND_API_KEY", "MAIL_FROM"])("does not accept %s alone", (key) => {
    expect(() =>
      validateEnv({ ...BASE, [key]: key === "MAIL_FROM" ? "a@b.com" : "re_key" }),
    ).toThrow("Set both RESEND_API_KEY and MAIL_FROM, or neither");
  });

  it.each([
    "no-reply@libreriamisueno.com.ar",
    "Librería Mi Sueño <no-reply@libreriamisueno.com.ar>",
  ])("accepts MAIL_FROM=%s", (from) => {
    expect(validateEnv({ ...BASE, RESEND_API_KEY: "re_key", MAIL_FROM: from }).MAIL_FROM).toBe(
      from,
    );
  });

  it.each(["no-reply@", "no-reply", "Librería <no-reply@libreriamisueno.com.ar", "<>"])(
    "rejects MAIL_FROM=%s",
    (from) => {
      expect(() => validateEnv({ ...BASE, RESEND_API_KEY: "re_key", MAIL_FROM: from })).toThrow(
        "MAIL_FROM",
      );
    },
  );

  it.each(["RESEND_API_KEY", "MAIL_FROM"])("requires %s in production", (key) => {
    const production = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://libreria_app.ref:pwd@db.example.com:5432/postgres",
      DATABASE_SSL_MODE: "require",
      JWT_ACCESS_SECRET: SECRET,
      RESEND_API_KEY: "re_key",
      MAIL_FROM: "no-reply@libreriamisueno.com.ar",
    };

    expect(() => validateEnv(production)).not.toThrow();
    expect(() => validateEnv({ ...production, [key]: "" })).toThrow(key);
  });

  it.each(["0", "-1"])("rejects DATABASE_POOL_MAX=%s", (value) => {
    expect(() => validateEnv({ ...BASE, DATABASE_POOL_MAX: value })).toThrow("DATABASE_POOL_MAX");
  });
});
