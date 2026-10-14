import { validateEnv } from "./env.js";

const LOCAL_URL = "postgresql://libreria_app:libreria_app@127.0.0.1:54322/postgres";

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
    const env = validateEnv({ DATABASE_URL: LOCAL_URL });

    expect(env.DATABASE_SSL_MODE).toBe("disable");
    expect(env.DATABASE_POOL_MAX).toBe(10);
    expect(env.DATABASE_SSL_CA).toBeUndefined();
  });

  it("accepts the local pooler profile", () => {
    const env = validateEnv({
      DATABASE_URL: "postgresql://libreria_app.pooler-dev:libreria_app@127.0.0.1:54329/postgres",
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
    });

    expect(env.DATABASE_SSL_MODE).toBe("verify-full");
  });

  it("fails with verify-full and no CA", () => {
    expect(() =>
      validateEnv({ DATABASE_URL: LOCAL_URL, DATABASE_SSL_MODE: "verify-full" }),
    ).toThrow("DATABASE_SSL_CA");
  });

  it("fails in production with SSL disabled", () => {
    expect(() => validateEnv({ NODE_ENV: "production", DATABASE_URL: LOCAL_URL })).toThrow(
      "SSL cannot be disabled in production",
    );
  });

  it("converts DATABASE_POOL_MAX from a string", () => {
    expect(
      validateEnv({ DATABASE_URL: LOCAL_URL, DATABASE_POOL_MAX: "20" }).DATABASE_POOL_MAX,
    ).toBe(20);
  });

  it.each(["0", "-1"])("rejects DATABASE_POOL_MAX=%s", (value) => {
    expect(() => validateEnv({ DATABASE_URL: LOCAL_URL, DATABASE_POOL_MAX: value })).toThrow(
      "DATABASE_POOL_MAX",
    );
  });
});
