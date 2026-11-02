import { drizzle } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { databaseSslSchema, postgresUrl, refineDatabaseSsl } from "../config/database-env.js";
import { ImageSettings } from "../modules/catalog/application/settings/image-settings.js";
import { SharpImageProcessor } from "../modules/catalog/infrastructure/images/sharp-image-processor.js";
import { seedDemoCatalog } from "../modules/catalog/infrastructure/seed/seed-demo-catalog.js";
import { createPool } from "../shared/infrastructure/database/create-pool.js";
import * as schema from "../shared/infrastructure/database/schema/index.js";
import {
  createStorageClient,
  SupabaseFileStorage,
} from "../shared/infrastructure/storage/supabase-file-storage.js";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: postgresUrl,
    SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  })
  .extend(databaseSslSchema.shape)
  .superRefine(refineDatabaseSsl);

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(`Invalid seed settings:\n${z.prettifyError(parsed.error)}`);
  process.exit(1);
}

const env = parsed.data;
// Sample data only belongs in a local database.
if (env.NODE_ENV === "production") {
  console.error("The sample catalog is for local development; refusing to seed production");
  process.exit(1);
}

const pool = createPool({
  url: env.DATABASE_URL,
  sslMode: env.DATABASE_SSL_MODE,
  sslCa: env.DATABASE_SSL_CA,
  max: 1,
});

try {
  const result = await seedDemoCatalog(
    drizzle({ client: pool, schema }),
    new SupabaseFileStorage(createStorageClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)),
    new SharpImageProcessor(new ImageSettings()),
  );
  console.log(
    result.status === "created"
      ? `Sample catalog created: ${result.categories} categories, ${result.products} products`
      : "The sample catalog is already there; nothing to do",
  );
} catch (error) {
  console.error(`Seed failed: ${(error as Error).message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
