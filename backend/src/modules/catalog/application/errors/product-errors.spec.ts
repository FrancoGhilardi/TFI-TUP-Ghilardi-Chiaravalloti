import {
  EntityNotFoundError,
  ExternalServiceError,
} from "../../../../shared/domain/errors/index.js";
import { ImageUploadFailedError } from "./image-upload-failed-error.js";
import { ProductImageNotFoundError } from "./product-image-not-found-error.js";
import { ProductNotFoundError } from "./product-not-found-error.js";

describe("product application errors", () => {
  it("answers a failed upload as an external failure that keeps its cause", () => {
    const cause = new Error("storage down");
    const error = new ImageUploadFailedError(cause);

    expect(error).toBeInstanceOf(ExternalServiceError);
    expect(error).toMatchObject({
      code: "IMAGE_UPLOAD_FAILED",
      message: "No se pudieron subir las imágenes. Probá de nuevo.",
      cause,
    });
  });

  it("answers an unknown product with 404", () => {
    const error = new ProductNotFoundError();

    expect(error).toBeInstanceOf(EntityNotFoundError);
    expect(error).toMatchObject({
      code: "PRODUCT_NOT_FOUND",
      message: "No encontramos el producto.",
    });
  });

  it("answers an unknown image, or one of another product, with 404", () => {
    const error = new ProductImageNotFoundError();

    expect(error).toBeInstanceOf(EntityNotFoundError);
    expect(error).toMatchObject({
      code: "PRODUCT_IMAGE_NOT_FOUND",
      message: "No encontramos la imagen.",
    });
  });
});
