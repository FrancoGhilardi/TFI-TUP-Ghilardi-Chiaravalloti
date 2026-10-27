import { ROLES_KEY } from "../../../identity/presentation/decorators/roles.decorator.js";
import type { AuthUser } from "../../../identity/presentation/auth-user.js";
import type { CreateProductUseCase } from "../../application/use-cases/create-product.use-case.js";
import { AdminProductsController } from "./admin-products.controller.js";
import type { CreateProductRequestDto } from "./create-product.request.dto.js";

const ACTOR = { id: "user-1" } as AuthUser;

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
  const create = { execute: vi.fn(() => Promise.resolve({})) };
  const controller = new AdminProductsController(create as unknown as CreateProductUseCase);
  return { create, controller };
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
});
