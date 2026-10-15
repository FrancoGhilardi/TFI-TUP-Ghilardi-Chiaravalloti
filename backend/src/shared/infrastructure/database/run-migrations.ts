import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPool, type DatabaseConnectionOptions } from "./create-pool.js";

/** Applies the pending migrations from `./drizzle` using a dedicated single-connection pool. */
export async function runMigrations(
  options: Pick<DatabaseConnectionOptions, "url" | "sslMode" | "sslCa">,
): Promise<void> {
  const pool = createPool({ ...options, max: 1 });
  try {
    await migrate(drizzle({ client: pool }), {
      migrationsFolder: "./drizzle",
      migrationsSchema: "drizzle",
      migrationsTable: "__drizzle_migrations",
    });
  } finally {
    await pool.end();
  }
}
