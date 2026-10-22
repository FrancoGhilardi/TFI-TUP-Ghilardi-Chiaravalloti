import { z } from "zod";
import { databaseSslSchema, postgresUrl, refineDatabaseSsl } from "./database-env.js";

// The example secret shipped in .env.example starts with this prefix; it must never reach production.
const DEVELOPMENT_SECRET_PREFIX = "dev-only-";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    FRONTEND_URL: z.url().default("http://localhost:3000"),
    DATABASE_URL: postgresUrl,
    DATABASE_POOL_MAX: z.coerce.number().int().positive().max(50).default(10),
    JWT_ACCESS_SECRET: z.string().min(32),
    // Under a minute forces constant renewals; over an hour keeps a stolen token useful too long.
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    // How long a session lasts without being renewed, in days.
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  })
  .extend(databaseSslSchema.shape)
  .superRefine(refineDatabaseSsl)
  .superRefine((env, ctx) => {
    if (
      env.NODE_ENV === "production" &&
      env.JWT_ACCESS_SECRET.startsWith(DEVELOPMENT_SECRET_PREFIX)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_ACCESS_SECRET"],
        message: "The development secret cannot be used in production",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Validates and types the environment variables; throws with every problem found. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Variables de entorno inválidas:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
