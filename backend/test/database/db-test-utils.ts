import type { Pool, PoolClient } from "pg";
import type { SslMode } from "../../src/config/database-env.js";
import { createPool } from "../../src/shared/infrastructure/database/create-pool.js";

export type Queryable = Pick<Pool, "query">;

const TABLES = [
  "product_images",
  "related_products",
  "product_categories",
  "products",
  "categories",
  "sessions",
  "users",
];

function connection(url: string | undefined) {
  if (!url) {
    throw new Error("Database URL is not set; check the .env file");
  }
  return {
    url,
    sslMode: (process.env.DATABASE_SSL_MODE ?? "disable") as SslMode,
    sslCa: process.env.DATABASE_SSL_CA || undefined,
  };
}

export function adminPool(): Pool {
  return createPool({ ...connection(process.env.DATABASE_MIGRATION_URL), max: 2 });
}

export function appPool(): Pool {
  return createPool({ ...connection(process.env.DATABASE_URL), max: 2 });
}

export async function truncateAll(pool: Queryable): Promise<void> {
  await pool.query(`TRUNCATE ${TABLES.map((table) => `libreria.${table}`).join(", ")} CASCADE`);
  await pool.query("ALTER SEQUENCE libreria.product_sku_seq RESTART");
}

/** Runs the work in a transaction; constraint triggers deferred to COMMIT surface as errors here. */
export async function inTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

let counter = 0;
const unique = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

interface UserOptions {
  email?: string;
  role?: "ADMIN" | "SELLER";
  isActive?: boolean;
}

export async function insertUser(db: Queryable, options: UserOptions = {}): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO libreria.users (email, name, password_hash, role, is_active)
     VALUES ($1, 'Test user', 'hash', $2, $3) RETURNING id`,
    [
      options.email ?? `user-${unique()}@example.com`,
      options.role ?? "SELLER",
      options.isActive ?? true,
    ],
  );
  return rows[0].id;
}

export async function insertCategory(
  db: Queryable,
  name = `Category ${unique()}`,
): Promise<string> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const { rows } = await db.query<{ id: string }>(
    "INSERT INTO libreria.categories (name, slug) VALUES ($1, $2) RETURNING id",
    [name, slug],
  );
  return rows[0].id;
}

export async function insertImage(
  db: Queryable,
  productId: string,
  position: number,
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO libreria.product_images (product_id, position, original_key, mime_type)
     VALUES ($1, $2, $3, 'image/jpeg') RETURNING id`,
    [productId, position, `original/${unique()}.jpg`],
  );
  return rows[0].id;
}

interface ProductOptions {
  title?: string;
  categoryId?: string;
  price?: string;
}

/** Inserts a product with its primary category and first image in one transaction. */
export async function insertProductWithDeps(
  pool: Pool,
  options: ProductOptions = {},
): Promise<{ id: string; categoryId: string }> {
  const title = options.title ?? `Product ${unique()}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return inTransaction(pool, async (client) => {
    const categoryId = options.categoryId ?? (await insertCategory(client));
    const { rows } = await client.query<{ id: string }>(
      "INSERT INTO libreria.products (title, slug, price) VALUES ($1, $2, $3) RETURNING id",
      [title, slug, options.price ?? "10.00"],
    );
    const id = rows[0].id;
    await client.query(
      "INSERT INTO libreria.product_categories (product_id, category_id, is_primary) VALUES ($1, $2, true)",
      [id, categoryId],
    );
    await insertImage(client, id, 1);
    return { id, categoryId };
  });
}
