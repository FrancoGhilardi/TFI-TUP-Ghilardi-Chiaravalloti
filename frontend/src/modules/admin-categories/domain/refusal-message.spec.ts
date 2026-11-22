import { describe, expect, it } from "vitest";

import { ApiError } from "@/modules/core/http";

import { blockedCount, refusalMessage } from "./refusal-message";

const refusal = (details?: ApiError["details"]) =>
  new ApiError({
    status: 422,
    code: "CATEGORY_HAS_ACTIVE_CHILDREN",
    message: "La categoría tiene subcategorías.",
    details,
  });

describe("blockedCount", () => {
  it("reads how many block the action", () => {
    expect(blockedCount(refusal({ count: 3 }))).toBe(3);
  });

  it.each([undefined, { count: "3" }, { otro: 1 }, [{ field: "x", messages: ["y"] }]])(
    "has none for %j",
    (details) => {
      expect(blockedCount(refusal(details as ApiError["details"]))).toBeUndefined();
    },
  );

  it("has none for what is not the API's error", () => {
    expect(blockedCount(new TypeError("boom"))).toBeUndefined();
  });
});

describe("refusalMessage", () => {
  it("names the subcategories that block it, in the plural", () => {
    expect(refusalMessage(refusal({ count: 3 }), "Falló.")).toBe(
      "La categoría tiene subcategorías. Tiene 3 subcategorías.",
    );
  });

  it("says it in the singular for one", () => {
    expect(refusalMessage(refusal({ count: 1 }), "Falló.")).toBe(
      "La categoría tiene subcategorías. Tiene 1 subcategoría.",
    );
  });

  it("names the products that use it", () => {
    const inUse = new ApiError({
      status: 422,
      code: "CATEGORY_IN_USE",
      message: "La categoría es la única de algunos productos.",
      details: { count: 2 },
    });

    expect(refusalMessage(inUse, "Falló.")).toBe(
      "La categoría es la única de algunos productos. Hay 2 productos que la usan.",
    );
  });

  it("falls back to a general word for a refusal it does not know", () => {
    const other = new ApiError({
      status: 422,
      code: "OTHER",
      message: "No.",
      details: { count: 1 },
    });

    expect(refusalMessage(other, "Falló.")).toBe("No. Hay 1 elemento que la bloquea.");
  });

  it("gives only the API's reason when it does not say how many", () => {
    expect(refusalMessage(refusal(), "Falló.")).toBe("La categoría tiene subcategorías.");
  });

  it("gives the fallback for a failure that is not the API's", () => {
    expect(refusalMessage(new TypeError("boom"), "Falló.")).toBe("Falló.");
  });
});
