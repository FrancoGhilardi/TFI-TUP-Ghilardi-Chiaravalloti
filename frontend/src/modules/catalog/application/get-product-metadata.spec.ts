import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/modules/core/http";

import { getProductDetail } from "../infrastructure/product-detail-api";
import { getProductMetadata } from "./get-product-metadata";

vi.mock("../infrastructure/product-detail-api", () => ({ getProductDetail: vi.fn() }));

const read = vi.mocked(getProductDetail);

beforeEach(() => {
  read.mockReset();
});

describe("getProductMetadata", () => {
  it("names a product that is not in the store and keeps it out of search engines", async () => {
    read.mockRejectedValue(new ApiError({ status: 404, code: "PRODUCT_NOT_FOUND", message: "" }));

    await expect(getProductMetadata("x")).resolves.toEqual({
      title: "Producto no encontrado",
      robots: { index: false },
    });
  });

  it("still gives the page a title when the product cannot be read", async () => {
    read.mockRejectedValue(new ApiError({ status: 0, code: "TIMEOUT", message: "" }));

    await expect(getProductMetadata("x")).resolves.toEqual({
      title: "No pudimos cargar el producto",
      robots: { index: false },
    });
  });
});
