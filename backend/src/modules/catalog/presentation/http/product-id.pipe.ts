import { ParseUUIDPipe } from "@nestjs/common";
import { ProductNotFoundError } from "../../application/errors/product-not-found-error.js";

// An id that is not a UUID cannot name any product; it never reaches the database.
export const PRODUCT_ID = new ParseUUIDPipe({ exceptionFactory: () => new ProductNotFoundError() });
