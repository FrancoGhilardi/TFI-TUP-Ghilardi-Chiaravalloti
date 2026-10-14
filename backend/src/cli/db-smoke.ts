import { type Env, validateEnv } from "../config/env.js";
import { createPool } from "../shared/infrastructure/database/create-pool.js";

const TABLES = [
  "users",
  "sessions",
  "categories",
  "products",
  "product_categories",
  "related_products",
  "product_images",
];
const FUNCTIONS = ["libreria.next_product_sku()", "libreria.immutable_unaccent(text)"];
const EXTENSIONS = ["citext", "pg_trgm", "unaccent"];

let env: Env;
try {
  env = validateEnv(process.env);
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const pool = createPool({
  url: env.DATABASE_URL,
  sslMode: env.DATABASE_SSL_MODE,
  sslCa: env.DATABASE_SSL_CA,
  max: 1,
});

async function scalar(query: string, params: unknown[] = []): Promise<unknown> {
  const result = await pool.query<unknown[]>({ text: query, values: params, rowMode: "array" });
  return result.rows[0]?.[0];
}

const checks: Array<{ name: string; run: () => Promise<string | null> }> = [
  { name: "connection", run: async () => ((await scalar("select 1")) === 1 ? "ok" : null) },
  { name: "server version", run: async () => String(await scalar("show server_version")) },
  { name: "user", run: async () => String(await scalar("select current_user")) },
  {
    name: "ssl",
    run: async () =>
      String(await scalar("select ssl from pg_stat_ssl where pid = pg_backend_pid()")),
  },
  {
    name: "tables",
    run: async () => {
      const missing: string[] = [];
      for (const table of TABLES) {
        if ((await scalar("select to_regclass($1)", [`libreria.${table}`])) === null) {
          missing.push(table);
        }
      }
      if (missing.length > 0) throw new Error(`missing ${missing.join(", ")}`);
      return "ok";
    },
  },
  {
    name: "functions",
    run: async () => {
      const missing: string[] = [];
      for (const signature of FUNCTIONS) {
        if ((await scalar("select to_regprocedure($1)", [signature])) === null) {
          missing.push(signature);
        }
      }
      if (missing.length > 0) throw new Error(`missing ${missing.join(", ")}`);
      return "ok";
    },
  },
  {
    name: "extensions",
    run: async () => {
      const found = await scalar("select count(*)::int from pg_extension where extname = any($1)", [
        EXTENSIONS,
      ]);
      return found === EXTENSIONS.length ? "ok" : null;
    },
  },
  {
    name: "read",
    run: async () => {
      await scalar("select count(*) from libreria.products");
      return "ok";
    },
  },
  {
    // Fails when the extensions schema is missing from the role's search_path: the citext
    // operators are not found and the comparison falls back to case-sensitive text.
    name: "citext comparison",
    run: async () =>
      (await scalar("select 'a'::extensions.citext = 'A'::extensions.citext")) === true
        ? "case-insensitive"
        : null,
  },
  {
    name: "write (rolled back)",
    run: async () => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "INSERT INTO libreria.categories (name, slug) VALUES ('db-smoke', 'db-smoke')",
        );
        return "ok";
      } finally {
        await client.query("ROLLBACK");
        client.release();
      }
    },
  },
  {
    name: "schema create privilege",
    run: async () =>
      (await scalar("select has_schema_privilege('libreria', 'CREATE')")) === false
        ? "false"
        : null,
  },
];

let failed = false;
for (const check of checks) {
  try {
    const value = await check.run();
    if (value === null) failed = true;
    console.log(`${check.name}: ${value ?? "FAIL"}`);
  } catch (error) {
    failed = true;
    console.log(`${check.name}: FAIL (${(error as Error).message})`);
  }
}
await pool.end();
process.exit(failed ? 1 : 0);
