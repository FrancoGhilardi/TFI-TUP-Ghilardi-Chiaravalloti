import { z } from "zod";
import { databaseSslSchema, postgresUrl, refineDatabaseSsl } from "./database-env.js";

describe("postgresUrl", () => {
  it.each([
    "postgresql://libreria_app:libreria_app@127.0.0.1:54322/postgres",
    "postgresql://libreria_app.pooler-dev:libreria_app@127.0.0.1:54329/postgres",
    "postgres://libreria_app.ref:pwd@aws-1-us-west-2.pooler.supabase.com:5432/postgres",
  ])("accepts %s", (url) => {
    expect(postgresUrl.safeParse(url).success).toBe(true);
  });

  it("rejects a value that is not a URL", () => {
    expect(postgresUrl.safeParse("not a url").success).toBe(false);
  });

  it("rejects a scheme that is not postgres", () => {
    expect(postgresUrl.safeParse("mysql://user:pwd@localhost:3306/db").success).toBe(false);
  });

  it.each(["sslmode=require", "ssl=true", "sslrootcert=ca.pem", "uselibpqcompat=true"])(
    "rejects the %s URL parameter",
    (param) => {
      const result = postgresUrl.safeParse(`postgresql://u:p@localhost:5432/postgres?${param}`);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain("DATABASE_SSL_MODE");
    },
  );
});

describe("database SSL settings", () => {
  const schema = databaseSslSchema
    .extend({ NODE_ENV: z.string().optional() })
    .superRefine(refineDatabaseSsl);

  it("defaults the mode to disable", () => {
    expect(schema.parse({}).DATABASE_SSL_MODE).toBe("disable");
  });

  it("treats an empty CA as undefined", () => {
    expect(schema.parse({ DATABASE_SSL_CA: "" }).DATABASE_SSL_CA).toBeUndefined();
  });

  it("requires a CA with verify-full", () => {
    const result = schema.safeParse({ DATABASE_SSL_MODE: "verify-full" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["DATABASE_SSL_CA"]);
  });

  it("accepts verify-full with a CA", () => {
    const result = schema.safeParse({
      DATABASE_SSL_MODE: "verify-full",
      DATABASE_SSL_CA: "-----BEGIN CERTIFICATE-----",
    });

    expect(result.success).toBe(true);
  });

  it("rejects disabling SSL in production", () => {
    const result = schema.safeParse({ NODE_ENV: "production", DATABASE_SSL_MODE: "disable" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["DATABASE_SSL_MODE"]);
  });

  it("rejects an unknown mode", () => {
    expect(schema.safeParse({ DATABASE_SSL_MODE: "prefer" }).success).toBe(false);
  });
});
