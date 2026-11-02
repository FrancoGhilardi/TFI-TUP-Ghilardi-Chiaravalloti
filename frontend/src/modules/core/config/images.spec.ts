import { describe, expect, it } from "vitest";

import { isLoopbackOrigin, isOptimizableImage, storageImagePattern } from "./images";

describe("storageImagePattern", () => {
  it("allows only the public objects of the storage origin", () => {
    expect(storageImagePattern("https://abc.supabase.co").href).toBe(
      "https://abc.supabase.co/storage/v1/object/public/**",
    );
  });
});

describe("isOptimizableImage", () => {
  const origin = "http://127.0.0.1:54321";

  it.each([
    ["http://127.0.0.1:54321/storage/v1/object/public/product-images/p1.webp", true],
    ["http://localhost:54321/storage/v1/object/public/product-images/p1.webp", false],
    ["http://127.0.0.1:54321/storage/v1/object/sign/product-originals/p1.png", false],
    ["https://cdn.example.com/p1.webp", false],
  ])("%s is optimizable: %s", (url, optimizable) => {
    expect(isOptimizableImage(url, origin)).toBe(optimizable);
  });
});

describe("isLoopbackOrigin", () => {
  it.each([
    ["http://127.0.0.1:54321", true],
    ["http://localhost:54321", true],
    ["http://[::1]:54321", true],
    ["http://127.0.0.2:54321", true],
    ["http://0.0.0.0:54321", true],
    ["https://abc.supabase.co", false],
    ["http://192.168.0.10:54321", false],
  ])("%s is loopback: %s", (origin, loopback) => {
    expect(isLoopbackOrigin(origin)).toBe(loopback);
  });
});
