import { ROLES_KEY } from "../../../identity/presentation/decorators/roles.decorator.js";
import type { AddProductImageUseCase } from "../../application/use-cases/add-product-image.use-case.js";
import { ProductImagesController } from "./product-images.controller.js";

const ID = "4f9c1f43-6f4b-4d5c-9a3e-0000000000a1";

describe("ProductImagesController", () => {
  it("is open to admins and sellers", () => {
    expect(Reflect.getMetadata(ROLES_KEY, ProductImagesController)).toEqual(["ADMIN", "SELLER"]);
  });

  it("adds the file with its alt text to the product of the route", async () => {
    const add = { execute: vi.fn(() => Promise.resolve({ id: "image-1" })) };
    const controller = new ProductImagesController(add as unknown as AddProductImageUseCase);
    const buffer = Buffer.from([0xff, 0xd8, 0xff]);

    await expect(
      controller.add(ID, { altText: "Tapa" }, { buffer } as Express.Multer.File),
    ).resolves.toEqual({ id: "image-1" });

    expect(add.execute).toHaveBeenCalledExactlyOnceWith({
      productId: ID,
      image: { bytes: buffer, altText: "Tapa" },
    });
  });
});
