import type { INestApplication } from "@nestjs/common";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import { AccessTokenService } from "./../src/modules/identity/application/ports/access-token-service.js";
import { UserRepository } from "./../src/modules/identity/domain/repositories/user.repository.js";
import type { ErrorResponse } from "./../src/shared/presentation/http/error-response.js";
import { createTestApp } from "./create-test-app.js";
import {
  adminPool,
  insertProductWithDeps,
  insertUser,
  truncateAll,
} from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const UNKNOWN_ID = "4f9c1f43-6f4b-4d5c-9a3e-000000000000";

interface CategoryBody {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent: { id: string; name: string; slug: string } | null;
  sortOrder: number;
  isActive: boolean;
  depth: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface CategoryRow {
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
  deleted_at: Date | null;
  updated_at: Date;
}

describe("Admin categories (e2e)", () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let pool: Pool;
  let token: string;

  beforeAll(() => {
    pool = adminPool();
  });

  // A fresh app per test starts the rate limits at zero.
  beforeEach(async () => {
    await truncateAll(pool);
    app = await createTestApp();
    http = request(app.getHttpServer());
    token = await tokenFor(await insertUser(pool, { role: "ADMIN", mustChangePassword: false }));
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await truncateAll(pool);
    await pool.end();
  });

  async function tokenFor(id: string): Promise<string> {
    const user = await app.get(UserRepository, { strict: false }).findById(id);
    if (!user) throw new Error(`User ${id} not found`);
    return app.get(AccessTokenService, { strict: false }).issue(user).token;
  }

  async function readRow(id: string): Promise<CategoryRow> {
    const { rows } = await pool.query<CategoryRow>(
      `SELECT name, slug, parent_id, is_active, deleted_at, updated_at
       FROM libreria.categories WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  const auth = (pending: request.Test) => pending.set("Authorization", `Bearer ${token}`);

  const list = (query = "") => auth(http.get(`/api/v1/admin/categories${query}`));
  const get = (id: string) => auth(http.get(`/api/v1/admin/categories/${id}`));
  const post = (body: object) => auth(http.post("/api/v1/admin/categories").send(body));
  const patch = (id: string, body: object) =>
    auth(http.patch(`/api/v1/admin/categories/${id}`).send(body));
  const remove = (id: string) => auth(http.delete(`/api/v1/admin/categories/${id}`));
  const restore = (id: string) => auth(http.post(`/api/v1/admin/categories/${id}/restore`));

  async function create(body: object): Promise<CategoryBody> {
    return (await post(body).expect(201)).body as CategoryBody;
  }

  const expectError = async (pending: request.Test, statusCode: number, code: string) => {
    const response = await pending.expect(statusCode);
    const body = response.body as ErrorResponse;
    expect(body.code).toBe(code);
    return body;
  };

  describe("POST /admin/categories", () => {
    it("creates a root category with a slug from its name and the exact shape", async () => {
      const response = await post({
        name: " Útiles Escolares ",
        description: "Para el cole",
      }).expect(201);

      const body = response.body as CategoryBody;
      expect(body).toEqual({
        id: expect.any(String) as string,
        name: "Útiles Escolares",
        slug: "utiles-escolares",
        description: "Para el cole",
        parent: null,
        sortOrder: 0,
        isActive: true,
        depth: 0,
        productCount: 0,
        createdAt: expect.any(String) as string,
        updatedAt: expect.any(String) as string,
        deletedAt: null,
      });
    });

    it("creates it inactive under an inactive parent, with its position", async () => {
      const parent = await create({ name: "Escritura", isActive: false });

      const child = await create({
        name: "Cuadernos",
        parentId: parent.id,
        sortOrder: 3,
        isActive: false,
      });

      expect(child).toMatchObject({
        parent: { id: parent.id, name: "Escritura", slug: "escritura" },
        depth: 1,
        sortOrder: 3,
        isActive: false,
      });
    });

    it("refuses a name a current category has, ignoring case", async () => {
      await create({ name: "Cuadernos" });

      await expectError(post({ name: "CUADERNOS" }), 409, "CATEGORY_NAME_IN_USE");
    });

    it("reuses the name of a deleted category, with the next free slug", async () => {
      const old = await create({ name: "Cuadernos" });
      await remove(old.id).expect(204);

      const again = await create({ name: "Cuadernos" });

      expect(again.slug).toBe("cuadernos-2");
    });

    it.each([
      ["unknown", async () => Promise.resolve(UNKNOWN_ID)],
      [
        "deleted",
        async (): Promise<string> => {
          const parent = await create({ name: "Escritura" });
          await remove(parent.id).expect(204);
          return parent.id;
        },
      ],
    ])("refuses a parent that is %s", async (_label, parentOf) => {
      const parentId = await parentOf();

      await expectError(post({ name: "Cuadernos", parentId }), 422, "PARENT_CATEGORY_UNAVAILABLE");
    });

    it.each([
      [{ name: "  " }, "VALIDATION_FAILED"],
      [{ name: "Cuadernos", parentId: "abc" }, "VALIDATION_FAILED"],
      [{ name: "Cuadernos", slug: "otro" }, "VALIDATION_FAILED"],
      [{ name: "a".repeat(101) }, "INVALID_CATEGORY_NAME"],
      [{ name: "Cuadernos", sortOrder: -1 }, "INVALID_SORT_ORDER"],
      [{ name: "¡¿?!" }, "INVALID_SLUG"],
    ])("rejects %o with 400 %s", async (body, code) => {
      await expectError(post(body), 400, code);
    });
  });

  describe("PATCH /admin/categories/:id", () => {
    it("changes only the fields sent, keeping the slug", async () => {
      const category = await create({ name: "Cuadernos", description: "Rayados", sortOrder: 2 });

      const response = await patch(category.id, {
        name: "Cuadernos y blocks",
        isActive: false,
      }).expect(200);

      expect(response.body).toMatchObject({
        name: "Cuadernos y blocks",
        slug: "cuadernos",
        description: "Rayados",
        sortOrder: 2,
        isActive: false,
      });
    });

    it("moves it under a parent and back to the root with null", async () => {
      const parent = await create({ name: "Escritura" });
      const category = await create({ name: "Cuadernos" });

      const moved = await patch(category.id, { parentId: parent.id }).expect(200);
      expect(moved.body).toMatchObject({ parent: { id: parent.id }, depth: 1 });

      const root = await patch(category.id, { parentId: null, description: "" }).expect(200);
      expect(root.body).toMatchObject({ parent: null, depth: 0, description: null });
    });

    it("refuses to move it under one of its subcategories", async () => {
      const root = await create({ name: "Escritura" });
      const child = await create({ name: "Cuadernos", parentId: root.id });

      await expectError(patch(root.id, { parentId: child.id }), 422, "CATEGORY_CYCLE");
      await expectError(patch(root.id, { parentId: root.id }), 422, "CATEGORY_CYCLE");
    });

    it("refuses a name another current category has", async () => {
      await create({ name: "Lápices" });
      const category = await create({ name: "Cuadernos" });

      await expectError(patch(category.id, { name: "lápices" }), 409, "CATEGORY_NAME_IN_USE");
    });

    it("refuses to edit a deleted category", async () => {
      const category = await create({ name: "Cuadernos" });
      await remove(category.id).expect(204);

      await expectError(patch(category.id, { sortOrder: 1 }), 422, "CATEGORY_DELETED");
    });

    it("leaves the row untouched when nothing changes", async () => {
      const category = await create({ name: "Cuadernos" });
      const before = await readRow(category.id);

      await patch(category.id, { name: "Cuadernos", isActive: true }).expect(200);

      expect(await readRow(category.id)).toEqual(before);
    });

    it.each([{ name: null }, { isActive: null }, { sortOrder: "1" }])(
      "rejects %o with 400",
      async (body) => {
        const category = await create({ name: "Cuadernos" });

        await expectError(patch(category.id, body), 400, "VALIDATION_FAILED");
      },
    );
  });

  describe("DELETE /admin/categories/:id", () => {
    it("deletes it logically and hides it from the store tree", async () => {
      const category = await create({ name: "Cuadernos" });

      const response = await remove(category.id).expect(204);

      expect(response.text).toBe("");
      expect((await readRow(category.id)).deleted_at).not.toBeNull();
      const tree = await http.get("/api/v1/categories").expect(200);
      expect(tree.body).toEqual([]);
    });

    it.each([
      ["an active subcategory", true],
      ["an inactive subcategory", false],
    ])("refuses while it has %s, telling how many", async (_label, isActive) => {
      const parent = await create({ name: "Escritura" });
      await create({ name: "Cuadernos", parentId: parent.id, isActive });
      await create({ name: "Lápices", parentId: parent.id });

      const body = await expectError(remove(parent.id), 422, "CATEGORY_HAS_ACTIVE_CHILDREN");

      expect(body.details).toEqual({ count: 2 });
      expect((await readRow(parent.id)).deleted_at).toBeNull();
    });

    it("deletes it once its subcategories are deleted", async () => {
      const parent = await create({ name: "Escritura" });
      const child = await create({ name: "Cuadernos", parentId: parent.id });
      await remove(child.id).expect(204);

      await remove(parent.id).expect(204);
    });

    it("refuses while it is the only category of a current product, telling how many", async () => {
      const category = await create({ name: "Cuadernos" });
      await insertProductWithDeps(pool, { categoryId: category.id });

      const body = await expectError(remove(category.id), 422, "CATEGORY_IN_USE");

      expect(body.details).toEqual({ count: 1 });
      expect((await get(category.id).expect(200)).body).toMatchObject({ productCount: 1 });
    });

    it("answers the same to a second deletion, keeping the first date", async () => {
      const category = await create({ name: "Cuadernos" });
      await remove(category.id).expect(204);
      const first = await readRow(category.id);

      await remove(category.id).expect(204);

      expect(await readRow(category.id)).toEqual(first);
    });
  });

  describe("POST /admin/categories/:id/restore", () => {
    it("restores it with the active state it had", async () => {
      const category = await create({ name: "Cuadernos", isActive: false });
      await remove(category.id).expect(204);

      const response = await restore(category.id).expect(200);

      expect(response.body).toMatchObject({ id: category.id, isActive: false, deletedAt: null });
    });

    it("refuses while its parent is deleted, and restores it once the parent is back", async () => {
      const parent = await create({ name: "Escritura" });
      const child = await create({ name: "Cuadernos", parentId: parent.id });
      await remove(child.id).expect(204);
      await remove(parent.id).expect(204);

      await expectError(restore(child.id), 422, "PARENT_CATEGORY_UNAVAILABLE");
      expect((await readRow(child.id)).deleted_at).not.toBeNull();

      await restore(parent.id).expect(200);
      await restore(child.id).expect(200);
    });

    it("does not restore the subcategories with it", async () => {
      const parent = await create({ name: "Escritura" });
      const child = await create({ name: "Cuadernos", parentId: parent.id });
      await remove(child.id).expect(204);
      await remove(parent.id).expect(204);

      await restore(parent.id).expect(200);

      expect((await readRow(child.id)).deleted_at).not.toBeNull();
    });

    it("refuses when another current category has taken its name", async () => {
      const category = await create({ name: "Cuadernos" });
      await remove(category.id).expect(204);
      await create({ name: "cuadernos" });

      await expectError(restore(category.id), 409, "CATEGORY_NAME_IN_USE");
    });

    it("refuses a category that is not deleted", async () => {
      const category = await create({ name: "Cuadernos" });

      await expectError(restore(category.id), 422, "CATEGORY_NOT_DELETED");
    });
  });

  describe("GET /admin/categories", () => {
    it("lists the current ones in tree order, with their depth", async () => {
      const writing = await create({ name: "Escritura", sortOrder: 1 });
      await create({ name: "Escolar", sortOrder: 0 });
      await create({ name: "Lápices", parentId: writing.id });
      const gone = await create({ name: "Cuadernos", parentId: writing.id });
      await remove(gone.id).expect(204);

      const response = await list().expect(200);

      const page = response.body as { items: CategoryBody[]; totalItems: number };
      expect(page.items.map((item) => [item.name, item.depth])).toEqual([
        ["Escolar", 0],
        ["Escritura", 0],
        ["Lápices", 1],
      ]);
      expect(page.totalItems).toBe(3);
    });

    it("filters, searches and sorts by the query string", async () => {
      await create({ name: "Útiles", sortOrder: 5 });
      const gone = await create({ name: "Agendas" });
      await remove(gone.id).expect(204);

      const deleted = await list("?status=DELETED").expect(200);
      const searched = await list("?q=util").expect(200);
      const sorted = await list("?status=ALL&sortBy=SORT_ORDER&sortDir=DESC").expect(200);

      const namesOf = (body: unknown) =>
        (body as { items: CategoryBody[] }).items.map((item) => item.name);
      expect(namesOf(deleted.body)).toEqual(["Agendas"]);
      expect(namesOf(searched.body)).toEqual(["Útiles"]);
      expect(namesOf(sorted.body)).toEqual(["Útiles", "Agendas"]);
    });

    it("rejects an invalid query with 400", async () => {
      await expectError(list("?sortBy=PRICE"), 400, "VALIDATION_FAILED");
    });
  });

  describe("GET /admin/categories/:id", () => {
    it("gives a deleted category too", async () => {
      const category = await create({ name: "Cuadernos" });
      await remove(category.id).expect(204);

      const response = await get(category.id).expect(200);

      expect((response.body as CategoryBody).deletedAt).not.toBeNull();
    });

    it.each([UNKNOWN_ID, "not-a-uuid"])("answers 404 for %s", async (id) => {
      await expectError(get(id), 404, "CATEGORY_NOT_FOUND");
      await expectError(patch(id, {}), 404, "CATEGORY_NOT_FOUND");
      await expectError(remove(id), 404, "CATEGORY_NOT_FOUND");
      await expectError(restore(id), 404, "CATEGORY_NOT_FOUND");
    });
  });

  describe("access", () => {
    it("lets a seller manage categories", async () => {
      token = await tokenFor(await insertUser(pool, { mustChangePassword: false }));

      await create({ name: "Cuadernos" });
      await list().expect(200);
    });

    it("rejects a request without a token", async () => {
      await expectError(http.get("/api/v1/admin/categories"), 401, "INVALID_ACCESS_TOKEN");
    });
  });
});
