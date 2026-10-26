import type { INestApplication } from "@nestjs/common";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import { createTestApp } from "./create-test-app.js";
import { adminPool, truncateAll } from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

interface Row {
  name: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
  deleted?: boolean;
  description?: string;
}

interface Node {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  children: Node[];
}

describe("GET /categories (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;

  beforeAll(async () => {
    pool = adminPool();
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  beforeEach(async () => {
    await truncateAll(pool);
  });

  afterAll(async () => {
    await truncateAll(pool);
    await app.close();
    await pool.end();
  });

  async function insert(row: Row): Promise<string> {
    const slug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO libreria.categories (parent_id, name, slug, description, sort_order, is_active, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        row.parentId ?? null,
        row.name,
        slug,
        row.description ?? null,
        row.sortOrder ?? 0,
        row.isActive ?? true,
        row.deleted ? new Date() : null,
      ],
    );
    return rows[0].id;
  }

  const tree = async () => (await http.get("/api/v1/categories").expect(200)).body as Node[];

  const names = (nodes: Node[]): unknown =>
    nodes.map((node) => (node.children.length ? { [node.name]: names(node.children) } : node.name));

  it("answers without a token, with the tree and its exact shape", async () => {
    const writing = await insert({ name: "Escritura", description: "Para escribir" });
    const pens = await insert({ name: "Lapiceras", parentId: writing });

    const response = await http.get("/api/v1/categories").expect(200);

    expect(response.body).toEqual([
      {
        id: writing,
        name: "Escritura",
        slug: "escritura",
        description: "Para escribir",
        children: [
          { id: pens, name: "Lapiceras", slug: "lapiceras", description: null, children: [] },
        ],
      },
    ]);
  });

  it("can be kept for 60 seconds by the browser and caches", async () => {
    const response = await http.get("/api/v1/categories").expect(200);

    expect(response.get("Cache-Control")).toBe("public, max-age=60");
  });

  it("orders each level by its order, then by name", async () => {
    const root = await insert({ name: "Root" });
    await insert({ name: "Zeta", parentId: root, sortOrder: 0 });
    await insert({ name: "Beta", parentId: root, sortOrder: 1 });
    await insert({ name: "Alfa", parentId: root, sortOrder: 1 });
    await insert({ name: "Primera" });

    expect(names(await tree())).toEqual(["Primera", { Root: ["Zeta", "Alfa", "Beta"] }]);
  });

  describe("shows only active categories", () => {
    it.each([
      ["inactive", { isActive: false }],
      ["deleted", { deleted: true }],
    ])("hides an %s category with everything under it", async (_label, state) => {
      await insert({ name: "Visible" });
      const hidden = await insert({ name: "Hidden", ...state });
      const child = await insert({ name: "Child", parentId: hidden });
      await insert({ name: "Grandchild", parentId: child });

      expect(names(await tree())).toEqual(["Visible"]);
    });

    it("hides an inactive subcategory but keeps its parent", async () => {
      const parent = await insert({ name: "Parent" });
      await insert({ name: "Shown", parentId: parent });
      await insert({ name: "Off", parentId: parent, isActive: false });

      expect(names(await tree())).toEqual([{ Parent: ["Shown"] }]);
    });
  });

  it("leaves out categories stored in a loop, and still answers", async () => {
    await insert({ name: "Root" });
    const a = await insert({ name: "A" });
    const b = await insert({ name: "B", parentId: a });
    // The domain refuses this; written by hand, as only the database could hold it.
    await pool.query("UPDATE libreria.categories SET parent_id = $1 WHERE id = $2", [b, a]);

    expect(names(await tree())).toEqual(["Root"]);
  });

  it("is an empty list without categories", async () => {
    await expect(tree()).resolves.toEqual([]);
  });
});
