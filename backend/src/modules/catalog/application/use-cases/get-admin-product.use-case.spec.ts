import type { AdminProductDetailResult } from "../dto/admin-product-detail.result.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { AdminProductQueries } from "../ports/admin-product-queries.js";
import { GetAdminProductUseCase } from "./get-admin-product.use-case.js";

const DETAIL = { id: "product-1", deletedAt: new Date() } as AdminProductDetailResult;

class StubQueries extends AdminProductQueries {
  findById(id: string): Promise<AdminProductDetailResult | null> {
    return Promise.resolve(id === DETAIL.id ? DETAIL : null);
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

describe("GetAdminProductUseCase", () => {
  const getProduct = new GetAdminProductUseCase(new StubQueries());

  it("gives the product as the panel shows it, deleted or not", async () => {
    await expect(getProduct.execute("product-1")).resolves.toBe(DETAIL);
  });

  it("answers 404 for an unknown product", async () => {
    await expect(getProduct.execute("product-2")).rejects.toThrow(ProductNotFoundError);
  });
});
