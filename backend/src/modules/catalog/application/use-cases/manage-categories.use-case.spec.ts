import { Clock } from "../../../../shared/application/clock.js";
import { IdGenerator } from "../../../../shared/application/id-generator.js";
import type { Page } from "../../../../shared/application/pagination.js";
import { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import { UniqueSlugGenerator } from "../../../../shared/application/unique-slug-generator.js";
import { InvalidSlugError } from "../../../../shared/domain/errors/invalid-slug-error.js";
import { Slug } from "../../../../shared/domain/value-objects/slug.js";
import { Category, type CategoryProps } from "../../domain/entities/category.js";
import { CategoryCycleError } from "../../domain/errors/category-cycle-error.js";
import { CategoryDeletedError } from "../../domain/errors/category-deleted-error.js";
import { CategoryHasActiveChildrenError } from "../../domain/errors/category-has-active-children-error.js";
import { CategoryInUseError } from "../../domain/errors/category-in-use-error.js";
import { CategoryNameInUseError } from "../../domain/errors/category-name-in-use-error.js";
import { CategoryNotDeletedError } from "../../domain/errors/category-not-deleted-error.js";
import { InvalidCategoryNameError } from "../../domain/errors/invalid-category-name-error.js";
import { ParentCategoryUnavailableError } from "../../domain/errors/parent-category-unavailable-error.js";
import { CategoryRepository } from "../../domain/repositories/category.repository.js";
import { CategoryDeletionPolicy } from "../../domain/services/category-deletion.policy.js";
import type { AdminCategoryResult } from "../dto/admin-category.result.js";
import { CategoryNotFoundError } from "../errors/category-not-found-error.js";
import { CategoryQueries } from "../ports/category-queries.js";
import { CreateCategoryUseCase } from "./create-category.use-case.js";
import { DeleteCategoryUseCase } from "./delete-category.use-case.js";
import { RestoreCategoryUseCase } from "./restore-category.use-case.js";
import { UpdateCategoryUseCase } from "./update-category.use-case.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const EARLIER = new Date("2026-01-01T00:00:00.000Z");
const NEW_ID = "new-1";

class InMemoryCategoryRepository extends CategoryRepository {
  /** Current products whose only category is the key. */
  readonly onlyCategoryOf = new Map<string, number>();

  constructor(
    readonly categories: Category[],
    private readonly events: string[],
  ) {
    super();
  }

  findById(id: string): Promise<Category | null> {
    this.events.push(`find ${id}`);
    return Promise.resolve(this.categories.find((category) => category.getId() === id) ?? null);
  }

  existsByName(name: string, excludeId?: string): Promise<boolean> {
    this.events.push(`check name ${name}`);
    return Promise.resolve(
      this.categories.some(
        (category) =>
          category.name.toLowerCase() === name.toLowerCase() &&
          !category.isDeleted() &&
          category.getId() !== excludeId,
      ),
    );
  }

  existsBySlug(slug: Slug): Promise<boolean> {
    return Promise.resolve(this.categories.some((category) => category.slug.equals(slug)));
  }

  findAncestorIds(id: string): Promise<string[]> {
    this.events.push(`ancestors ${id}`);
    const ids: string[] = [];
    let current = this.categories.find((category) => category.getId() === id)?.parentId;
    while (current !== undefined && !ids.includes(current)) {
      ids.push(current);
      const parentId = current;
      current = this.categories.find((category) => category.getId() === parentId)?.parentId;
    }
    return Promise.resolve(ids);
  }

  countCurrentChildren(id: string): Promise<number> {
    this.events.push(`count children ${id}`);
    return Promise.resolve(
      this.categories.filter((category) => category.parentId === id && !category.isDeleted())
        .length,
    );
  }

  countProductsWhereOnlyCategory(id: string): Promise<number> {
    this.events.push(`count products ${id}`);
    return Promise.resolve(this.onlyCategoryOf.get(id) ?? 0);
  }

  lockHierarchy(): Promise<void> {
    this.events.push("lock hierarchy");
    return Promise.resolve();
  }

  save(category: Category): Promise<void> {
    this.events.push(`save ${category.getId()}`);
    if (!this.categories.includes(category)) {
      this.categories.push(category);
    }
    return Promise.resolve();
  }

  findVisibleByIds(): Promise<Category[]> {
    return Promise.reject(new Error("Not used"));
  }

  findCurrentIds(): Promise<string[]> {
    return Promise.reject(new Error("Not used"));
  }
}

class RepositoryBackedQueries extends CategoryQueries {
  constructor(private readonly repository: InMemoryCategoryRepository) {
    super();
  }

  findAdminById(id: string): Promise<AdminCategoryResult | null> {
    const category = this.repository.categories.find((stored) => stored.getId() === id);
    return Promise.resolve(
      category
        ? {
            id: category.getId(),
            name: category.name,
            slug: category.slug.toString(),
            description: category.description ?? null,
            parent: category.parentId ? { id: category.parentId, name: "", slug: "" } : null,
            sortOrder: category.sortOrder,
            isActive: category.active,
            depth: 0,
            productCount: 0,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
            deletedAt: category.deletedAt ?? null,
          }
        : null,
    );
  }

  findVisibleRows(): Promise<never[]> {
    return Promise.reject(new Error("Not used"));
  }

  findAdminPage(): Promise<Page<AdminCategoryResult>> {
    return Promise.reject(new Error("Not used"));
  }
}

class RecordingTransaction extends TransactionManager {
  constructor(private readonly events: string[]) {
    super();
  }

  async run<T>(work: () => Promise<T>): Promise<T> {
    this.events.push("begin");
    try {
      const result = await work();
      this.events.push("commit");
      return result;
    } catch (error) {
      this.events.push("rollback");
      throw error;
    }
  }
}

class FixedClock extends Clock {
  now(): Date {
    return NOW;
  }
}

class FixedIds extends IdGenerator {
  next(): string {
    return NEW_ID;
  }
}

function category(id: string, overrides: Partial<CategoryProps> = {}): Category {
  const name = overrides.name ?? `Category ${id}`;
  return Category.reconstitute({
    id,
    name,
    slug: Slug.fromText(name),
    sortOrder: 0,
    active: true,
    createdAt: EARLIER,
    updatedAt: EARLIER,
    ...overrides,
  });
}

const deleted = (id: string, overrides: Partial<CategoryProps> = {}) =>
  category(id, { deletedAt: EARLIER, ...overrides });

function setUp(categories: Category[]) {
  const events: string[] = [];
  const repository = new InMemoryCategoryRepository(categories, events);
  const queries = new RepositoryBackedQueries(repository);
  const transaction = new RecordingTransaction(events);
  const clock = new FixedClock();
  const create = new CreateCategoryUseCase(
    repository,
    new UniqueSlugGenerator(),
    new FixedIds(),
    queries,
    transaction,
    clock,
  );
  const update = new UpdateCategoryUseCase(repository, queries, transaction);
  const remove = new DeleteCategoryUseCase(
    repository,
    new CategoryDeletionPolicy(),
    transaction,
    clock,
  );
  const restore = new RestoreCategoryUseCase(repository, queries, transaction);
  const find = (id: string) => repository.categories.find((stored) => stored.getId() === id);
  return { events, repository, create, update, remove, restore, find };
}

describe("CreateCategoryUseCase", () => {
  it("creates an active root category with a slug from its name", async () => {
    const { create, find } = setUp([]);

    const result = await create.execute({
      name: "  Útiles Escolares ",
      description: " Para todos ",
    });

    expect(result).toMatchObject({
      id: NEW_ID,
      name: "Útiles Escolares",
      slug: "utiles-escolares",
      description: "Para todos",
      parent: null,
      sortOrder: 0,
      isActive: true,
      deletedAt: null,
    });
    expect(find(NEW_ID)?.createdAt).toBe(NOW);
  });

  it("locks the parent, checks the name and saves, in one transaction", async () => {
    const { events, create } = setUp([category("parent-1")]);

    await create.execute({ name: "Cuadernos", parentId: "parent-1", sortOrder: 2 });

    expect(events).toEqual([
      "begin",
      "find parent-1",
      "check name Cuadernos",
      `save ${NEW_ID}`,
      "commit",
    ]);
  });

  it("creates it under an inactive parent, and inactive when asked", async () => {
    const { create } = setUp([category("parent-1", { active: false })]);

    const result = await create.execute({
      name: "Cuadernos",
      parentId: "parent-1",
      isActive: false,
    });

    expect(result).toMatchObject({ parent: { id: "parent-1" }, isActive: false });
  });

  it.each([
    ["an unknown parent", [] as Category[]],
    ["a deleted parent", [deleted("parent-1")]],
  ])("refuses %s without saving", async (_label, categories) => {
    const { events, create } = setUp(categories);

    await expect(create.execute({ name: "Cuadernos", parentId: "parent-1" })).rejects.toThrow(
      ParentCategoryUnavailableError,
    );

    expect(events).not.toContain(`save ${NEW_ID}`);
  });

  it("refuses a name a current category has, ignoring case", async () => {
    const { create } = setUp([category("cat-1", { name: "Cuadernos" })]);

    await expect(create.execute({ name: "CUADERNOS" })).rejects.toThrow(CategoryNameInUseError);
  });

  it("takes the name of a deleted category, with the next free slug", async () => {
    const { create } = setUp([deleted("cat-1", { name: "Cuadernos" })]);

    const result = await create.execute({ name: "Cuadernos" });

    expect(result.slug).toBe("cuadernos-2");
  });

  it("refuses a blank name before opening a transaction", async () => {
    const { events, create } = setUp([]);

    await expect(create.execute({ name: "   " })).rejects.toThrow(InvalidCategoryNameError);

    expect(events).toEqual([]);
  });

  it("refuses a name without letters or digits", async () => {
    const { events, create } = setUp([]);

    await expect(create.execute({ name: "¡¿?!" })).rejects.toThrow(InvalidSlugError);

    expect(events.at(-1)).toBe("rollback");
  });
});

describe("UpdateCategoryUseCase", () => {
  it("changes only the fields sent", async () => {
    const { update, find } = setUp([
      category("cat-1", { name: "Cuadernos", description: "Rayados", sortOrder: 4 }),
    ]);

    const result = await update.execute({ categoryId: "cat-1", sortOrder: 1, isActive: false });

    expect(result).toMatchObject({
      name: "Cuadernos",
      slug: "cuadernos",
      description: "Rayados",
      sortOrder: 1,
      isActive: false,
    });
    expect(find("cat-1")?.active).toBe(false);
  });

  it("renames it, keeping the slug", async () => {
    const { update } = setUp([category("cat-1", { name: "Cuadernos" })]);

    const result = await update.execute({ categoryId: "cat-1", name: "Cuadernos y blocks" });

    expect(result).toMatchObject({ name: "Cuadernos y blocks", slug: "cuadernos" });
  });

  it("changes the case of its own name", async () => {
    const { update } = setUp([category("cat-1", { name: "cuadernos" })]);

    const result = await update.execute({ categoryId: "cat-1", name: "Cuadernos" });

    expect(result.name).toBe("Cuadernos");
  });

  it("refuses a name another current category has", async () => {
    const { events, update } = setUp([
      category("cat-1", { name: "Cuadernos" }),
      category("cat-2", { name: "Lápices" }),
    ]);

    await expect(update.execute({ categoryId: "cat-1", name: "lápices" })).rejects.toThrow(
      CategoryNameInUseError,
    );

    expect(events.at(-1)).toBe("rollback");
  });

  it("removes the description when it comes blank", async () => {
    const { update } = setUp([category("cat-1", { description: "Rayados" })]);

    const result = await update.execute({ categoryId: "cat-1", description: "  " });

    expect(result.description).toBeNull();
  });

  it("moves it under a parent with the hierarchy locked first, then the category and the parent", async () => {
    const { events, update } = setUp([category("cat-1"), category("parent-1", { active: false })]);

    const result = await update.execute({ categoryId: "cat-1", parentId: "parent-1" });

    expect(result.parent?.id).toBe("parent-1");
    expect(events).toEqual([
      "begin",
      "lock hierarchy",
      "find cat-1",
      "find parent-1",
      "ancestors parent-1",
      "save cat-1",
      "commit",
    ]);
  });

  it("moves it to the root with a null parent, without locking the hierarchy", async () => {
    const { events, update, find } = setUp([
      category("parent-1"),
      category("cat-1", { parentId: "parent-1" }),
    ]);

    await update.execute({ categoryId: "cat-1", parentId: null });

    expect(find("cat-1")?.parentId).toBeUndefined();
    expect(events).not.toContain("lock hierarchy");
  });

  it.each([
    ["under itself", "cat-1"],
    ["under one of its subcategories", "grandchild-1"],
  ])("refuses to move it %s", async (_label, parentId) => {
    const { events, update } = setUp([
      category("cat-1"),
      category("child-1", { parentId: "cat-1" }),
      category("grandchild-1", { parentId: "child-1" }),
    ]);

    await expect(update.execute({ categoryId: "cat-1", parentId })).rejects.toThrow(
      CategoryCycleError,
    );

    expect(events).not.toContain("save cat-1");
  });

  it.each([
    ["an unknown parent", [category("cat-1")]],
    ["a deleted parent", [category("cat-1"), deleted("parent-1")]],
  ])("refuses to move it under %s", async (_label, categories) => {
    const { update } = setUp(categories);

    await expect(update.execute({ categoryId: "cat-1", parentId: "parent-1" })).rejects.toThrow(
      ParentCategoryUnavailableError,
    );
  });

  it("saves nothing when nothing changes", async () => {
    const { events, update } = setUp([
      category("parent-1"),
      category("cat-1", {
        name: "Cuadernos",
        description: "Rayados",
        parentId: "parent-1",
        sortOrder: 2,
      }),
    ]);

    await update.execute({
      categoryId: "cat-1",
      name: " Cuadernos ",
      description: "Rayados",
      parentId: "parent-1",
      sortOrder: 2,
      isActive: true,
    });

    expect(events).not.toContain("save cat-1");
    expect(events).not.toContain("ancestors parent-1");
  });

  it("refuses to edit a deleted category, even with no changes", async () => {
    const { update } = setUp([deleted("cat-1")]);

    await expect(update.execute({ categoryId: "cat-1" })).rejects.toThrow(CategoryDeletedError);
  });

  it("refuses a blank name before opening a transaction", async () => {
    const { events, update } = setUp([category("cat-1")]);

    await expect(update.execute({ categoryId: "cat-1", name: " " })).rejects.toThrow(
      InvalidCategoryNameError,
    );

    expect(events).toEqual([]);
  });

  it("fails with CATEGORY_NOT_FOUND for an unknown id", async () => {
    const { update } = setUp([]);

    await expect(update.execute({ categoryId: "nobody", sortOrder: 1 })).rejects.toThrow(
      CategoryNotFoundError,
    );
  });
});

describe("DeleteCategoryUseCase", () => {
  it("deletes it logically, keeping its active state", async () => {
    const { events, remove, find } = setUp([category("cat-1", { active: false })]);

    await remove.execute({ categoryId: "cat-1" });

    expect(find("cat-1")).toMatchObject({ deletedAt: NOW, active: false });
    expect(events).toEqual([
      "begin",
      "lock hierarchy",
      "find cat-1",
      "count children cat-1",
      "count products cat-1",
      "save cat-1",
      "commit",
    ]);
  });

  it.each([
    ["an active subcategory", { active: true }],
    ["an inactive subcategory", { active: false }],
  ])("refuses while it has %s, telling how many", async (_label, overrides) => {
    const { events, remove, find } = setUp([
      category("cat-1"),
      category("child-1", { parentId: "cat-1", ...overrides }),
    ]);

    await expect(remove.execute({ categoryId: "cat-1" })).rejects.toThrow(
      expect.objectContaining({
        constructor: CategoryHasActiveChildrenError,
        publicDetails: { count: 1 },
      }),
    );

    expect(find("cat-1")?.isDeleted()).toBe(false);
    expect(events).not.toContain("save cat-1");
  });

  it("is not stopped by deleted subcategories", async () => {
    const { remove, find } = setUp([category("cat-1"), deleted("child-1", { parentId: "cat-1" })]);

    await remove.execute({ categoryId: "cat-1" });

    expect(find("cat-1")?.isDeleted()).toBe(true);
  });

  it("refuses while it is the only category of some products, telling how many", async () => {
    const { repository, remove } = setUp([category("cat-1")]);
    repository.onlyCategoryOf.set("cat-1", 2);

    await expect(remove.execute({ categoryId: "cat-1" })).rejects.toThrow(
      expect.objectContaining({ constructor: CategoryInUseError, publicDetails: { count: 2 } }),
    );
  });

  it("changes nothing for a category already deleted", async () => {
    const { events, remove, find } = setUp([deleted("cat-1")]);

    await expect(remove.execute({ categoryId: "cat-1" })).resolves.toBeUndefined();

    expect(find("cat-1")?.deletedAt).toBe(EARLIER);
    expect(events).toEqual(["begin", "lock hierarchy", "find cat-1", "commit"]);
  });

  it("fails with CATEGORY_NOT_FOUND for an unknown id", async () => {
    const { remove } = setUp([]);

    await expect(remove.execute({ categoryId: "nobody" })).rejects.toThrow(CategoryNotFoundError);
  });
});

describe("RestoreCategoryUseCase", () => {
  it("restores it with the active state it had", async () => {
    const { restore } = setUp([deleted("cat-1", { active: false })]);

    const result = await restore.execute({ categoryId: "cat-1" });

    expect(result).toMatchObject({ id: "cat-1", isActive: false, deletedAt: null });
  });

  it("locks the hierarchy, the category and its parent, then checks the name and saves", async () => {
    const { events, restore } = setUp([
      category("parent-1"),
      deleted("cat-1", { name: "Cuadernos", parentId: "parent-1" }),
    ]);

    await restore.execute({ categoryId: "cat-1" });

    expect(events).toEqual([
      "begin",
      "lock hierarchy",
      "find cat-1",
      "find parent-1",
      "check name Cuadernos",
      "save cat-1",
      "commit",
    ]);
  });

  it("restores it under an inactive parent", async () => {
    const { restore } = setUp([
      category("parent-1", { active: false }),
      deleted("cat-1", { parentId: "parent-1" }),
    ]);

    const result = await restore.execute({ categoryId: "cat-1" });

    expect(result.deletedAt).toBeNull();
  });

  it("refuses while its parent is deleted", async () => {
    const { events, restore, find } = setUp([
      deleted("parent-1"),
      deleted("cat-1", { parentId: "parent-1" }),
    ]);

    await expect(restore.execute({ categoryId: "cat-1" })).rejects.toThrow(
      ParentCategoryUnavailableError,
    );

    expect(find("cat-1")?.isDeleted()).toBe(true);
    expect(events).not.toContain("save cat-1");
  });

  it("refuses when another current category has taken its name", async () => {
    const { events, restore } = setUp([
      deleted("cat-1", { name: "Cuadernos" }),
      category("cat-2", { name: "cuadernos" }),
    ]);

    await expect(restore.execute({ categoryId: "cat-1" })).rejects.toThrow(CategoryNameInUseError);

    // The restore made in memory is rolled back, never saved.
    expect(events).not.toContain("save cat-1");
    expect(events.at(-1)).toBe("rollback");
  });

  it("refuses a category that is not deleted", async () => {
    const { restore } = setUp([category("cat-1")]);

    await expect(restore.execute({ categoryId: "cat-1" })).rejects.toThrow(CategoryNotDeletedError);
  });

  it("fails with CATEGORY_NOT_FOUND for an unknown id", async () => {
    const { restore } = setUp([]);

    await expect(restore.execute({ categoryId: "nobody" })).rejects.toThrow(CategoryNotFoundError);
  });
});
