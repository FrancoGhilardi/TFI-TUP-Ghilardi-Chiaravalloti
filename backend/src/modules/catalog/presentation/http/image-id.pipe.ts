import { ParseUUIDPipe } from "@nestjs/common";
import { ProductImageNotFoundError } from "../../application/errors/product-image-not-found-error.js";

// An id that is not a UUID cannot name any image; it never reaches the database.
export const IMAGE_ID = new ParseUUIDPipe({
  exceptionFactory: () => new ProductImageNotFoundError(),
});
