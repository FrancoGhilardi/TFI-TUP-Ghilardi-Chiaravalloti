import { Clock } from "../../../../shared/application/clock.js";
import type { Product } from "../../domain/entities/product.js";
import {
  type ClearedMarks,
  ProductRepository,
} from "../../domain/repositories/product.repository.js";
import { ExpireProductMarksUseCase } from "./expire-product-marks.use-case.js";

const NOW = new Date("2026-10-28T03:00:00.000Z");

class FixedClock extends Clock {
  now(): Date {
    return NOW;
  }
}

class CountingProducts extends ProductRepository {
  readonly calls: Date[] = [];

  clearExpiredMarks(now: Date): Promise<ClearedMarks> {
    this.calls.push(now);
    return Promise.resolve({ sales: 2, newMarks: 1 });
  }

  findById(): Promise<Product | null> {
    return Promise.reject(new Error("Not used"));
  }

  existsBySlug(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  lockSlug(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findExistingIds(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  save(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

describe("ExpireProductMarksUseCase", () => {
  it("clears the sales and new marks ended by now, giving how many", async () => {
    const products = new CountingProducts();

    await expect(
      new ExpireProductMarksUseCase(products, new FixedClock()).execute(),
    ).resolves.toEqual({ sales: 2, newMarks: 1 });
    expect(products.calls).toEqual([NOW]);
  });
});
