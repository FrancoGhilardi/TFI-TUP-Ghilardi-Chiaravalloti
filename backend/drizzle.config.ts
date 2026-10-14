import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // No .env file: variables come from the environment (CI, Render).
}

const url = process.env.DATABASE_MIGRATION_URL;
if (!url) {
  throw new Error("DATABASE_MIGRATION_URL is required to run drizzle-kit");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/shared/infrastructure/database/schema/index.ts",
  out: "./drizzle",
  schemaFilter: ["libreria"],
  dbCredentials: { url },
  migrations: { schema: "drizzle", table: "__drizzle_migrations" },
  strict: true,
  verbose: true,
});
