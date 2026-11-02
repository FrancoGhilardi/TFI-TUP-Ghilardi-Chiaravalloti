import { Clock } from "../../../../shared/application/clock.js";
import { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import { InvalidMoneyError } from "../../../../shared/domain/errors/invalid-money-error.js";
import { Money } from "../../../../shared/domain/value-objects/money.js";
import { Slug } from "../../../../shared/domain/value-objects/slug.js";
import { Product } from "../../domain/entities/product.js";
import { CategoryUnavailableError } from "../../domain/errors/category-unavailable-error.js";
import { InvalidCategoryAssignmentError } from "../../domain/errors/invalid-category-assignment-error.js";
import { InvalidNewUntilError } from "../../domain/errors/invalid-new-until-error.js";
import { InvalidRelatedProductsError } from "../../domain/errors/invalid-related-products-error.js";
import { InvalidSaleEndError } from "../../domain/errors/invalid-sale-end-error.js";
import { ProductDeletedError } from "../../domain/errors/product-deleted-error.js";
import { ProductNotDeletedError } from "../../domain/errors/product-not-deleted-error.js";
import { ProductWithoutCategoryError } from "../../domain/errors/product-without-category-error.js";
import { RelatedProductUnavailableError } from "../../domain/errors/related-product-unavailable-error.js";
import { SalePriceNotLowerError } from "../../domain/errors/sale-price-not-lower-error.js";
import { SelfRelatedProductError } from "../../domain/errors/self-related-product-error.js";
import { CategoryRepository } from "../../domain/repositories/category.repository.js";
import { ProductRepository } from "../../domain/repositories/product.repository.js";
import { CategoryAssignment } from "../../domain/value-objects/category-assignment.js";
import { Sku } from "../../domain/value-objects/sku.js";
import type { AdminProductDetailResult } from "../dto/admin-product-detail.result.js";
import type { UpdateProductCommand } from "../dto/update-product.command.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { AdminProductQueries } from "../ports/admin-product-queries.js";
import { DeleteProductUseCase } from "./delete-product.use-case.js";
import { RestoreProductUseCase } from "./restore-product.use-case.js";
import { UpdateProductUseCase } from "./update-product.use-case.js";

const CREATED = new Date("2026-10-01T12:00:00.000Z");
const NOW = new Date("2026-10-22T12:00:00.000Z");
const LATER = new Date("2026-11-22T12:00:00.000Z");
const pesos = (text: string) => Money.fromDecimal(text);

class InMemoryProducts extends ProductRepository {
  readonly stored = new Map<string, Product>();
  existing: string[] = [];
  saves = 0;

  constructor(private readonly events: string[]) {
    super();
  }

  findById(id: string): Promise<Product | null> {
    this.events.push(`find ${id}`);
    return Promise.resolve(this.stored.get(id) ?? null);
  }

  findExistingIds(ids: string[]): Promise<string[]> {
    this.events.push(`check related ${ids.join(",")}`);
    return Promise.resolve(ids.filter((id) => this.existing.includes(id)));
  }

  save(product: Product): Promise<void> {
    this.events.push(`save ${product.getId()}`);
    this.saves++;
    this.stored.set(product.getId(), product);
    return Promise.resolve();
  }

  existsBySlug(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  lockSlug(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  clearExpiredMarks(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

class FakeCategories extends CategoryRepository {
  visible = ["cat-1", "cat-2", "cat-3"];
  inactive = ["cat-hidden"];

  constructor(private readonly events: string[]) {
    super();
  }

  findVisibleByIds(ids: string[]) {
    this.events.push(`check visible ${ids.join(",")}`);
    return Promise.resolve(
      ids.filter((id) => this.visible.includes(id)).map((id) => ({ getId: () => id }) as never),
    );
  }

  findCurrentIds(ids: string[]): Promise<string[]> {
    this.events.push(`check current ${ids.join(",")}`);
    return Promise.resolve(
      ids.filter((id) => this.visible.includes(id) || this.inactive.includes(id)),
    );
  }

  findById(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  existsByName(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  existsBySlug(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  findAncestorIds(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  countCurrentChildren(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  countProductsWhereOnlyCategory(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  lockHierarchy(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  lockSlug(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
  save(): Promise<never> {
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

class RecordingClock extends Clock {
  time = NOW;

  constructor(private readonly events: string[]) {
    super();
  }

  now(): Date {
    this.events.push("now");
    return this.time;
  }
}

class StubQueries extends AdminProductQueries {
  findById(id: string): Promise<AdminProductDetailResult | null> {
    return Promise.resolve({ id } as AdminProductDetailResult);
  }
  findImageById(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findImagesByProduct(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findPage(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

function setUp() {
  const events: string[] = [];
  const products = new InMemoryProducts(events);
  const categories = new FakeCategories(events);
  const transaction = new RecordingTransaction(events);
  const clock = new RecordingClock(events);
  const queries = new StubQueries();
  const product = Product.create({
    id: "product-1",
    sku: Sku.fromValue("LMS-000007"),
    title: "Cuaderno A4",
    slug: Slug.fromText("Cuaderno A4"),
    description: "Tapa dura",
    price: pesos("1000"),
    stock: 3,
    categories: CategoryAssignment.fromIds(["cat-1", "cat-2"], "cat-1"),
    createdBy: "admin-1",
    now: CREATED,
  });
  products.stored.set("product-1", product);
  products.existing = ["product-1", "other-1", "other-2"];
  return {
    events,
    products,
    categories,
    clock,
    product,
    update: new UpdateProductUseCase(products, categories, transaction, queries, clock),
    remove: new DeleteProductUseCase(products, transaction, clock),
    restore: new RestoreProductUseCase(products, categories, transaction, queries),
  };
}

const edit = (changes: Partial<UpdateProductCommand> = {}): UpdateProductCommand => ({
  productId: "product-1",
  actorId: "seller-1",
  ...changes,
});

describe("UpdateProductUseCase", () => {
  it("changes only what is sent, records the author and saves in the transaction", async () => {
    const { events, product, update } = setUp();

    const result = await update.execute(edit({ stock: 8, isFeatured: true }));

    expect(result.id).toBe("product-1");
    expect(events).toEqual(["begin", "find product-1", "now", "save product-1", "commit"]);
    expect(product).toMatchObject({
      stock: 8,
      featured: true,
      title: "Cuaderno A4",
      description: "Tapa dura",
      updatedBy: "seller-1",
    });
    expect(product.price.toDecimalString()).toBe("1000.00");
  });

  it("keeps the slug and the SKU when the title changes", async () => {
    const { product, update } = setUp();

    await update.execute(edit({ title: "Cuaderno Rayado" }));

    expect(product.title).toBe("Cuaderno Rayado");
    expect(product.slug.toString()).toBe("cuaderno-a4");
    expect(product.sku.toString()).toBe("LMS-000007");
  });

  it("removes the description when it comes blank", async () => {
    const { product, update } = setUp();

    await update.execute(edit({ description: "" }));

    expect(product.description).toBeUndefined();
  });

  it("saves nothing, nor records an author, when nothing changes", async () => {
    const { products, product, update } = setUp();

    await update.execute(
      edit({
        title: "Cuaderno A4",
        price: "1000",
        stock: 3,
        isActive: true,
        sale: null,
        newMark: null,
        categories: { ids: ["cat-2", "cat-1"], primaryId: "cat-1" },
        relatedProductIds: [],
      }),
    );

    expect(products.saves).toBe(0);
    expect(product.updatedBy).toBe("admin-1");
  });

  it("refuses a deleted product, even with nothing to change", async () => {
    const { product, products, update } = setUp();
    product.softDelete("admin-1", NOW);

    await expect(update.execute(edit())).rejects.toThrow(ProductDeletedError);
    expect(products.saves).toBe(0);
  });

  it("answers 404 for an unknown product", async () => {
    const { update } = setUp();

    await expect(update.execute(edit({ productId: "missing" }))).rejects.toThrow(
      ProductNotFoundError,
    );
  });

  it.each([
    ["a malformed price", { price: "10,50" }, InvalidMoneyError],
    ["a malformed sale price", { sale: { price: "abc" } }, InvalidMoneyError],
    [
      "repeated categories",
      { categories: { ids: ["cat-1", "cat-1"], primaryId: "cat-1" } },
      InvalidCategoryAssignmentError,
    ],
  ] as const)("refuses %s before opening a transaction", async (_label, changes, error) => {
    const { events, update } = setUp();

    await expect(update.execute(edit(changes as Partial<UpdateProductCommand>))).rejects.toThrow(
      error,
    );
    expect(events).toEqual([]);
  });

  describe("sale and new mark", () => {
    it("takes a new price and a new sale together, even below the old sale", async () => {
      const { product, update } = setUp();
      product.startSale(pesos("800"), undefined, NOW);

      await update.execute(edit({ price: "700", sale: { price: "600", endsAt: LATER } }));

      expect(product.price.toDecimalString()).toBe("700.00");
      expect(product.salePrice?.toDecimalString()).toBe("600.00");
      expect(product.saleEndsAt).toBe(LATER);
    });

    it("keeps a running sale below a new price sent alone", async () => {
      const { product, update } = setUp();
      product.startSale(pesos("800"), undefined, NOW);

      await expect(update.execute(edit({ price: "700" }))).rejects.toThrow(SalePriceNotLowerError);
    });

    it("ends the sale and removes the new mark", async () => {
      const { product, update } = setUp();
      product.startSale(pesos("800"), LATER, NOW);
      product.markAsNew(LATER, NOW);

      await update.execute(edit({ sale: null, newMark: null }));

      expect(product).toMatchObject({
        onSale: false,
        salePrice: undefined,
        saleEndsAt: undefined,
        isNewFlag: false,
        newUntil: undefined,
      });
    });

    it("replaces a sale and a mark that differ from the stored ones", async () => {
      const { product, update } = setUp();
      product.startSale(pesos("800"), LATER, NOW);

      await update.execute(edit({ sale: { price: "750" }, newMark: { until: LATER } }));

      expect(product.salePrice?.toDecimalString()).toBe("750.00");
      expect(product.saleEndsAt).toBeUndefined();
      expect(product).toMatchObject({ isNewFlag: true, newUntil: LATER });
    });

    it("accepts the stored sale and mark sent back after they ended, changing nothing", async () => {
      const { clock, products, product, update } = setUp();
      product.startSale(pesos("800"), LATER, NOW);
      product.markAsNew(LATER, NOW);
      clock.time = new Date(LATER.getTime() + 1000);

      await update.execute(
        edit({ sale: { price: "800", endsAt: LATER }, newMark: { until: LATER } }),
      );

      expect(products.saves).toBe(0);
    });

    it("accepts the sale and mark sent back after the cleanup removed them, changing nothing", async () => {
      const { clock, products, update } = setUp();
      clock.time = new Date(LATER.getTime() + 1000);

      await update.execute(
        edit({ sale: { price: "800", endsAt: LATER }, newMark: { until: LATER } }),
      );

      expect(products.saves).toBe(0);
    });

    it.each([
      ["a sale", { sale: { price: "500", endsAt: NOW } }, InvalidSaleEndError],
      ["a new mark", { newMark: { until: NOW } }, InvalidNewUntilError],
    ] as const)(
      "refuses %s ending by the time the product is locked, replacing a running one",
      async (_l, changes, error) => {
        const { product, update } = setUp();
        product.startSale(pesos("800"), LATER, NOW);
        product.markAsNew(LATER, NOW);

        await expect(update.execute(edit(changes))).rejects.toThrow(error);
      },
    );
  });

  describe("categories", () => {
    it("checks only the new ones are visible, keeping one deleted meanwhile, and replaces them all", async () => {
      const { events, categories, product, update } = setUp();
      categories.visible = ["cat-1", "cat-3"];
      categories.inactive = [];

      await update.execute(edit({ categories: { ids: ["cat-2", "cat-3"], primaryId: "cat-3" } }));

      expect(events).toContain("check visible cat-3");
      expect(events.some((event) => event.startsWith("check current"))).toBe(false);
      expect(product.getPrimaryCategoryId()).toBe("cat-3");
      expect(product.categories.map((assignment) => assignment.categoryId)).toEqual([
        "cat-2",
        "cat-3",
      ]);
    });

    it("sent back as they are, takes them while one of them is current, hidden or not", async () => {
      const { events, categories, product, update } = setUp();
      categories.visible = [];
      categories.inactive = ["cat-2"];

      await update.execute(edit({ categories: { ids: ["cat-1", "cat-2"], primaryId: "cat-2" } }));

      expect(events).toContain("check current cat-1,cat-2");
      expect(product.getPrimaryCategoryId()).toBe("cat-2");
    });

    it("refuses a new category that is not visible", async () => {
      const { products, update } = setUp();

      await expect(
        update.execute(edit({ categories: { ids: ["cat-1", "cat-hidden"], primaryId: "cat-1" } })),
      ).rejects.toThrow(CategoryUnavailableError);
      expect(products.saves).toBe(0);
    });

    it("refuses keeping only categories that were all deleted", async () => {
      const { categories, update } = setUp();
      categories.visible = [];
      categories.inactive = [];

      await expect(
        update.execute(edit({ categories: { ids: ["cat-1", "cat-2"], primaryId: "cat-1" } })),
      ).rejects.toThrow(CategoryUnavailableError);
    });
  });

  describe("related products", () => {
    it("replaces them in order, checked inside the transaction", async () => {
      const { events, product, update } = setUp();

      await update.execute(edit({ relatedProductIds: ["other-2", "other-1"] }));

      expect(product.relatedProductIds).toEqual(["other-2", "other-1"]);
      // Those with a lower id are locked before the product itself.
      expect(events).toEqual([
        "begin",
        "check related other-2,other-1",
        "find product-1",
        "now",
        "check related other-2,other-1",
        "save product-1",
        "commit",
      ]);
    });

    it("locks those with a higher id only after the product", async () => {
      const { events, products, update } = setUp();
      products.existing.push("zeta-1");

      await update.execute(edit({ relatedProductIds: ["zeta-1"] }));

      expect(events.slice(0, 4)).toEqual([
        "begin",
        "find product-1",
        "now",
        "check related zeta-1",
      ]);
    });

    it("checks only the new ones, keeping one deleted meanwhile", async () => {
      const { events, products, product, update } = setUp();
      product.setRelatedProducts(["gone-1"]);

      await update.execute(edit({ relatedProductIds: ["gone-1", "other-1"] }));

      expect(product.relatedProductIds).toEqual(["gone-1", "other-1"]);
      expect(events.filter((event) => event.startsWith("check related")).at(-1)).toBe(
        "check related other-1",
      );
      expect(products.saves).toBe(1);
    });

    it("refuses one that is gone", async () => {
      const { update } = setUp();

      await expect(update.execute(edit({ relatedProductIds: ["gone-1"] }))).rejects.toThrow(
        RelatedProductUnavailableError,
      );
    });

    it.each([
      ["a repeated one", ["other-1", "other-2", "other-1"], InvalidRelatedProductsError],
      [
        "more than 4",
        ["other-1", "other-2", "other-3", "other-4", "other-5"],
        InvalidRelatedProductsError,
      ],
      ["itself, even repeated", ["product-1", "product-1"], SelfRelatedProductError],
    ])("refuses %s before opening the transaction", async (_label, ids, error) => {
      const { events, products, update } = setUp();

      await expect(update.execute(edit({ relatedProductIds: ids }))).rejects.toThrow(error);
      expect(events).toEqual([]);
      expect(products.saves).toBe(0);
    });

    it("refuses the product itself", async () => {
      const { update } = setUp();

      await expect(update.execute(edit({ relatedProductIds: ["product-1"] }))).rejects.toThrow(
        SelfRelatedProductError,
      );
    });
  });
});

describe("DeleteProductUseCase", () => {
  it("deletes logically with the date and author, keeping the active state", async () => {
    const { events, product, remove } = setUp();
    product.deactivate();

    await remove.execute({ productId: "product-1", actorId: "seller-1" });

    expect(events).toEqual(["begin", "find product-1", "now", "save product-1", "commit"]);
    expect(product).toMatchObject({ deletedAt: NOW, updatedBy: "seller-1", active: false });
  });

  it("changes nothing when deleted again", async () => {
    const { products, product, remove } = setUp();
    product.softDelete("admin-1", CREATED);

    await remove.execute({ productId: "product-1", actorId: "seller-1" });

    expect(products.saves).toBe(0);
    expect(product).toMatchObject({ deletedAt: CREATED, updatedBy: "admin-1" });
  });

  it("answers 404 for an unknown product", async () => {
    const { remove } = setUp();

    await expect(remove.execute({ productId: "missing", actorId: "seller-1" })).rejects.toThrow(
      ProductNotFoundError,
    );
  });
});

describe("RestoreProductUseCase", () => {
  it("restores with the state, slug and SKU it had, while a category is current", async () => {
    const { events, categories, product, restore } = setUp();
    product.deactivate();
    product.softDelete("admin-1", NOW);
    // Only one of its categories is left.
    categories.visible = [];
    categories.inactive = ["cat-2"];

    const result = await restore.execute({ productId: "product-1", actorId: "seller-1" });

    expect(result.id).toBe("product-1");
    expect(events).toEqual([
      "begin",
      "find product-1",
      "check current cat-1,cat-2",
      "save product-1",
      "commit",
    ]);
    expect(product).toMatchObject({ deletedAt: undefined, active: false, updatedBy: "seller-1" });
    expect(product.slug.toString()).toBe("cuaderno-a4");
    expect(product.sku.toString()).toBe("LMS-000007");
    // The deleted category stays assigned.
    expect(product.categories).toHaveLength(2);
  });

  it("refuses when every category of the product is deleted", async () => {
    const { categories, products, product, restore } = setUp();
    product.softDelete("admin-1", NOW);
    categories.visible = [];
    categories.inactive = [];

    await expect(restore.execute({ productId: "product-1", actorId: "seller-1" })).rejects.toThrow(
      ProductWithoutCategoryError,
    );
    expect(products.saves).toBe(0);
  });

  it("refuses a product that is not deleted, without reading its categories", async () => {
    const { events, restore } = setUp();

    await expect(restore.execute({ productId: "product-1", actorId: "seller-1" })).rejects.toThrow(
      ProductNotDeletedError,
    );
    expect(events.some((event) => event.startsWith("check current"))).toBe(false);
  });

  it("answers 404 for an unknown product", async () => {
    const { restore } = setUp();

    await expect(restore.execute({ productId: "missing", actorId: "seller-1" })).rejects.toThrow(
      ProductNotFoundError,
    );
  });
});
