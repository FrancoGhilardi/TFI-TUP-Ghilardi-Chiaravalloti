import { drizzle } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { databaseSslSchema, postgresUrl, refineDatabaseSsl } from "../config/database-env.js";
import { Argon2PasswordHasher } from "../modules/identity/infrastructure/argon2-password-hasher.js";
import { seedAdmin, seedAdminInputSchema } from "../modules/identity/infrastructure/seed-admin.js";
import { createPool } from "../shared/infrastructure/database/create-pool.js";
import * as schema from "../shared/infrastructure/database/schema/index.js";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: postgresUrl,
  })
  .extend(databaseSslSchema.shape)
  .extend(seedAdminInputSchema.shape)
  .superRefine(refineDatabaseSsl);

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(`Invalid seed settings:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

const env = parsed.data;
const pool = createPool({
  url: env.DATABASE_URL,
  sslMode: env.DATABASE_SSL_MODE,
  sslCa: env.DATABASE_SSL_CA,
  max: 1,
});

try {
  const result = await seedAdmin(
    drizzle({ client: pool, schema }),
    new Argon2PasswordHasher(),
    env,
  );
  console.log(
    result === "created"
      ? `Admin ${env.SEED_ADMIN_EMAIL.toString()} created`
      : "An active admin already exists; nothing to do",
  );
} catch (error) {
  console.error(`Seed failed: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
