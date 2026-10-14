import { z } from "zod";
import { databaseSslSchema, postgresUrl, refineDatabaseSsl } from "../src/config/database-env.js";
import { runMigrations } from "../src/shared/infrastructure/database/run-migrations.js";

const LOCAL_HOSTS = ["127.0.0.1", "localhost"];

const testEnvSchema = z
  .object({ DATABASE_MIGRATION_URL: postgresUrl, DATABASE_URL: postgresUrl })
  .extend(databaseSslSchema.shape)
  .superRefine(refineDatabaseSsl);

export default async function setup(): Promise<void> {
  try {
    process.loadEnvFile(process.env.ENV_FILE ?? ".env");
  } catch {
    // Variables come from the environment.
  }

  const env = testEnvSchema.parse(process.env);
  // These tests truncate tables; they must never run against a remote database.
  for (const url of [env.DATABASE_MIGRATION_URL, env.DATABASE_URL]) {
    if (!LOCAL_HOSTS.includes(new URL(url).hostname)) {
      throw new Error("E2E database tests only run against a local database");
    }
  }

  await runMigrations({
    url: env.DATABASE_MIGRATION_URL,
    sslMode: env.DATABASE_SSL_MODE,
    sslCa: env.DATABASE_SSL_CA,
  });
}
