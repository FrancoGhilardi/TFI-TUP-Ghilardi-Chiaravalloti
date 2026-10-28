import { ProductImage } from "../entities/product-image.js";
import { InvalidImageCountError } from "../errors/invalid-image-count-error.js";
import { InvalidImageOrderError } from "../errors/invalid-image-order-error.js";
import { ProductImageLimitReachedError } from "../errors/product-image-limit-reached-error.js";
import { ProductImagePolicy } from "./product-image.policy.js";

describe("ProductImagePolicy", () => {
  const policy = new ProductImagePolicy();

  it.each([
    [0, 1],
    [0, 5],
    [4, 1],
  ])("lets %i images take %i more", (current, incoming) => {
    expect(() => policy.assertCanAdd(current, incoming)).not.toThrow();
  });

  it.each([
    [0, 0],
    [0, 6],
    [5, 1],
    [3, 3],
  ])("refuses %i images taking %i more", (current, incoming) => {
    expect(() => policy.assertCanAdd(current, incoming)).toThrow(InvalidImageCountError);
  });

  it.each([0, 4])("has room for one more image next to %i", (current) => {
    expect(() => policy.assertRoomForOne(current)).not.toThrow();
  });

  it.each([5, 6])("has no room next to %i images", (current) => {
    expect(() => policy.assertRoomForOne(current)).toThrow(ProductImageLimitReachedError);
  });

  describe("reorder", () => {
    const imagesAt = (...ids: string[]) =>
      ids.map((id, index) =>
        ProductImage.register({
          id,
          productId: "product-1",
          position: index + 1,
          originalKey: `products/product-1/${id}.jpg`,
          mimeType: "image/jpeg",
          sizeBytes: 10,
          now: new Date("2026-10-28T12:00:00.000Z"),
        }),
      );
    const positions = (images: ProductImage[]) =>
      Object.fromEntries(images.map((image) => [image.getId(), image.position]));

    it("puts the images in the order given, from position 1", () => {
      const images = imagesAt("a", "b", "c");

      expect(policy.reorder(images, ["c", "a", "b"])).toBe(true);
      expect(positions(images)).toEqual({ c: 1, a: 2, b: 3 });
    });

    it("tells nothing moved when the order is the same", () => {
      const images = imagesAt("a", "b");

      expect(policy.reorder(images, ["a", "b"])).toBe(false);
      expect(positions(images)).toEqual({ a: 1, b: 2 });
    });

    it.each([
      ["one missing", ["a", "b"]],
      ["one repeated", ["a", "b", "b"]],
      ["one of another product", ["a", "b", "z"]],
      ["one too many", ["a", "b", "c", "z"]],
      ["none", []],
    ])("refuses an order with %s, moving nothing", (_label, ids) => {
      const images = imagesAt("a", "b", "c");

      expect(() => policy.reorder(images, ids)).toThrow(InvalidImageOrderError);
      expect(positions(images)).toEqual({ a: 1, b: 2, c: 3 });
    });
  });
});
