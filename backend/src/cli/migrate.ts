import { z } from "zod";
import { databaseSslSchema, postgresUrl, refineDatabaseSsl } from "../config/database-env.js";
import { runMigrations } from "../shared/infrastructure/database/run-migrations.js";

const migrationEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_MIGRATION_URL: postgresUrl,
  })
  .extend(databaseSslSchema.shape)
  .superRefine(refineDatabaseSsl);

const result = migrationEnvSchema.safeParse(process.env);
if (!result.success) {
  console.error(`Invalid migration settings:\n${z.prettifyError(result.error)}`);
  process.exit(1);
}

const env = result.data;
await runMigrations({
  url: env.DATABASE_MIGRATION_URL,
  sslMode: env.DATABASE_SSL_MODE,
  sslCa: env.DATABASE_SSL_CA,
});
console.log("Migrations applied");
