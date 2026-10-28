import { ImageKeyFactory } from "./image-key-factory.js";

describe("ImageKeyFactory", () => {
  it.each([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ] as const)("names the original of a %s by product and image", (mimeType, extension) => {
    expect(new ImageKeyFactory().originalKey("product-1", "image-1", mimeType)).toBe(
      `products/product-1/image-1.${extension}`,
    );
  });

  it("names each public version by product, image and version", () => {
    expect(new ImageKeyFactory().publicKey("product-1", "image-1", "version-1")).toBe(
      "products/product-1/image-1-vversion-1.webp",
    );
  });
});
