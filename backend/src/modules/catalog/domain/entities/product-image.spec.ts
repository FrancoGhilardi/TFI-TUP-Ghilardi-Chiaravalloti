import { InvalidImageError } from "../errors/invalid-image-error.js";
import { ImageStatus } from "../image-status.js";
import { type NewProductImageProps, ProductImage } from "./product-image.js";

const NOW = new Date("2026-10-22T12:00:00.000Z");

const register = (overrides: Partial<NewProductImageProps> = {}) =>
  ProductImage.register({
    id: "image-1",
    productId: "product-1",
    position: 1,
    originalKey: "products/product-1/image-1.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 2048,
    now: NOW,
    ...overrides,
  });

describe("ProductImage", () => {
  it("registers an image waiting to be processed, without a public version", () => {
    const image = register({ altText: "  Cuaderno rayado  " });

    expect(image).toMatchObject({
      productId: "product-1",
      position: 1,
      originalKey: "products/product-1/image-1.jpg",
      publicKey: undefined,
      altText: "Cuaderno rayado",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
      status: ImageStatus.PENDING,
      createdAt: NOW,
    });
  });

  it("takes a blank alt text as none", () => {
    expect(register({ altText: "   " }).altText).toBeUndefined();
  });

  it("accepts an alt text of 255 characters and rejects a longer one, naming the image", () => {
    expect(register({ altText: "ñ".repeat(255) }).altText).toHaveLength(255);
    expect(() => register({ position: 3, altText: "a".repeat(256) })).toThrow(
      expect.objectContaining({
        constructor: InvalidImageError,
        reason: "altText",
        message: "La imagen 3 no puede tener un texto alternativo de más de 255 caracteres.",
      }),
    );
  });

  it.each([0, 6, 1.5])("refuses the position %o", (position) => {
    expect(() => register({ position })).toThrow(RangeError);
  });

  it.each([0, -1, 1.5])("refuses %o bytes", (sizeBytes) => {
    expect(() => register({ sizeBytes })).toThrow(RangeError);
  });
});
