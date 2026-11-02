import type { AdminProductImageResult } from "../dto/admin-product-detail.result.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { AdminProductQueries } from "../ports/admin-product-queries.js";
import { ListProductImagesUseCase } from "./list-product-images.use-case.js";

const IMAGES = [{ id: "image-1" }, { id: "image-2" }] as AdminProductImageResult[];

class StubQueries extends AdminProductQueries {
  findImagesByProduct(productId: string): Promise<AdminProductImageResult[] | null> {
    return Promise.resolve(productId === "product-1" ? IMAGES : null);
  }

  findPage(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findById(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findImageById(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

describe("ListProductImagesUseCase", () => {
  const listImages = new ListProductImagesUseCase(new StubQueries());

  it("gives the product's images as the queries give them", async () => {
    await expect(listImages.execute("product-1")).resolves.toBe(IMAGES);
  });

  it("answers 404 for an unknown product", async () => {
    await expect(listImages.execute("product-2")).rejects.toThrow(ProductNotFoundError);
  });
});
