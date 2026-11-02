import { ROLES_KEY } from "../../../identity/presentation/decorators/roles.decorator.js";
import type { AuthUser } from "../../../identity/presentation/auth-user.js";
import type { CreateProductUseCase } from "../../application/use-cases/create-product.use-case.js";
import type { DeleteProductUseCase } from "../../application/use-cases/delete-product.use-case.js";
import type { RestoreProductUseCase } from "../../application/use-cases/restore-product.use-case.js";
import type { UpdateProductUseCase } from "../../application/use-cases/update-product.use-case.js";
import { AdminProductsController } from "./admin-products.controller.js";
import type { CreateProductRequestDto } from "./create-product.request.dto.js";

const ACTOR = { id: "user-1" } as AuthUser;
const ID = "4f9c1f43-6f4b-4d5c-9a3e-0000000000a1";

const BODY: CreateProductRequestDto = {
  title: "Cuaderno",
  price: "1500.50",
  isOnSale: false,
  stock: 3,
  isFeatured: true,
  isNew: false,
  isActive: true,
  categoryIds: ["cat-1"],
  primaryCategoryId: "cat-1",
};

const file = (bytes: number[]) => ({ buffer: Buffer.from(bytes) }) as Express.Multer.File;

function setUp() {
  const execute = () => vi.fn(() => Promise.resolve({}));
  const create = { execute: execute() };
  const update = { execute: execute() };
  const remove = { execute: vi.fn(() => Promise.resolve()) };
  const restore = { execute: execute() };
  const controller = new AdminProductsController(
    create as unknown as CreateProductUseCase,
    update as unknown as UpdateProductUseCase,
    remove as unknown as DeleteProductUseCase,
    restore as unknown as RestoreProductUseCase,
  );
  return { create, update, remove, restore, controller };
}

describe("AdminProductsController", () => {
  it("is open to admins and sellers", () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminProductsController)).toEqual(["ADMIN", "SELLER"]);
  });

  it("creates with the data, the author and the files in order, each with its alt text", async () => {
    const { create, controller } = setUp();

    await controller.create(
      { ...BODY, imageAltTexts: ["Tapa"], relatedProductIds: ["other-1"] },
      [file([1]), file([2])],
      ACTOR,
    );

    expect(create.execute).toHaveBeenCalledExactlyOnceWith({
      actorId: "user-1",
      title: "Cuaderno",
      description: undefined,
      price: "1500.50",
      sale: undefined,
      stock: 3,
      isFeatured: true,
      newMark: undefined,
      sortOrder: undefined,
      isActive: true,
      categoryIds: ["cat-1"],
      primaryCategoryId: "cat-1",
      relatedProductIds: ["other-1"],
      images: [
        { bytes: Buffer.from([1]), altText: "Tapa" },
        { bytes: Buffer.from([2]), altText: undefined },
      ],
    });
  });

  it("passes a sale and a new mark only when their flags are on, with their dates", async () => {
    const { create, controller } = setUp();

    await controller.create(
      {
        ...BODY,
        isOnSale: true,
        salePrice: "1000",
        saleEndsAt: "2099-01-01T00:00:00.000Z",
        isNew: true,
      },
      [file([1])],
      ACTOR,
    );

    expect(create.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sale: { price: "1000", endsAt: new Date("2099-01-01T00:00:00.000Z") },
        newMark: { until: undefined },
      }),
    );
  });

  describe("update", () => {
    it("passes only what was sent, with the author", async () => {
      const { update, controller } = setUp();

      await controller.update(ID, { stock: 4 }, ACTOR);

      expect(update.execute).toHaveBeenCalledExactlyOnceWith({
        productId: ID,
        actorId: "user-1",
        title: undefined,
        description: undefined,
        price: undefined,
        sale: undefined,
        stock: 4,
        isFeatured: undefined,
        newMark: undefined,
        sortOrder: undefined,
        isActive: undefined,
        categories: undefined,
        relatedProductIds: undefined,
      });
    });

    it("replaces the sale and the mark when their flags are on, with their dates", async () => {
      const { update, controller } = setUp();

      await controller.update(
        ID,
        { isOnSale: true, salePrice: "900", isNew: true, newUntil: "2099-01-01T00:00:00.000Z" },
        ACTOR,
      );

      expect(update.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sale: { price: "900", endsAt: undefined },
          newMark: { until: new Date("2099-01-01T00:00:00.000Z") },
        }),
      );
    });

    it("ends the sale and removes the mark when their flags are off", async () => {
      const { update, controller } = setUp();

      await controller.update(ID, { isOnSale: false, isNew: false }, ACTOR);

      expect(update.execute).toHaveBeenCalledWith(
        expect.objectContaining({ sale: null, newMark: null }),
      );
    });

    it("passes the categories with their primary one", async () => {
      const { update, controller } = setUp();

      await controller.update(
        ID,
        { categoryIds: ["cat-1", "cat-2"], primaryCategoryId: "cat-2" },
        ACTOR,
      );

      expect(update.execute).toHaveBeenCalledWith(
        expect.objectContaining({ categories: { ids: ["cat-1", "cat-2"], primaryId: "cat-2" } }),
      );
    });
  });

  it("deletes and restores with the author", async () => {
    const { remove, restore, controller } = setUp();

    await controller.remove(ID, ACTOR);
    await controller.restore(ID, ACTOR);

    expect(remove.execute).toHaveBeenCalledExactlyOnceWith({ productId: ID, actorId: "user-1" });
    expect(restore.execute).toHaveBeenCalledExactlyOnceWith({ productId: ID, actorId: "user-1" });
  });
});
