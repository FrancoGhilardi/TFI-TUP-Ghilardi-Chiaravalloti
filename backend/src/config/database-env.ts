import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional(),
);

// pg-connection-string lets these URL parameters override the ssl object built from DATABASE_SSL_*.
function hasSslUrlParam(value: string): boolean {
  if (!URL.canParse(value)) return false;
  for (const key of new URL(value).searchParams.keys()) {
    if (key.startsWith("ssl") || key === "uselibpqcompat") return true;
  }
  return false;
}

/** PostgreSQL URL without SSL parameters; SSL is configured only through `DATABASE_SSL_*`. */
export const postgresUrl = z
  .url({ protocol: /^postgres(ql)?$/, error: "Must be a postgres:// or postgresql:// URL" })
  .refine((value) => !hasSslUrlParam(value), {
    message: "Do not set SSL parameters in the URL; use DATABASE_SSL_MODE and DATABASE_SSL_CA",
  });

export const sslModeSchema = z.enum(["disable", "require", "verify-full"]);
export type SslMode = z.infer<typeof sslModeSchema>;

export const databaseSslSchema = z.object({
  DATABASE_SSL_MODE: sslModeSchema.default("disable"),
  DATABASE_SSL_CA: optionalString,
});

/** Cross-field SSL rules: `verify-full` needs a CA, and production cannot disable SSL. */
export function refineDatabaseSsl(
  env: { NODE_ENV?: string; DATABASE_SSL_MODE: SslMode; DATABASE_SSL_CA?: string },
  ctx: z.RefinementCtx,
): void {
  if (env.DATABASE_SSL_MODE === "verify-full" && !env.DATABASE_SSL_CA) {
    ctx.addIssue({
      code: "custom",
      path: ["DATABASE_SSL_CA"],
      message: "Required when DATABASE_SSL_MODE is verify-full",
    });
  }
  if (env.NODE_ENV === "production" && env.DATABASE_SSL_MODE === "disable") {
    ctx.addIssue({
      code: "custom",
      path: ["DATABASE_SSL_MODE"],
      message: "SSL cannot be disabled in production",
    });
  }
}
