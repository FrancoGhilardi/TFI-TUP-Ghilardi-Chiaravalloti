import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import multer, { type MulterError } from "multer";
import type { Observable } from "rxjs";
import { IMAGE_ALT_TEXT_MAX_LENGTH, PRODUCT_IMAGE_MAX_BYTES } from "../../domain/catalog-limits.js";
import { InvalidImageError } from "../../domain/errors/invalid-image-error.js";
import { formError, readMultipart } from "./multipart-form.js";
import { PRODUCT_ID } from "./product-id.pipe.js";

export const IMAGE_FIELD = "image";
const ALT_TEXT_FIELD = "altText";

// Enough for the longest alt text, even if every character took four bytes.
const ALT_TEXT_MAX_BYTES = IMAGE_ALT_TEXT_MAX_LENGTH * 4;

const parse = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: PRODUCT_IMAGE_MAX_BYTES,
    files: 1,
    fields: 1,
    fieldSize: ALT_TEXT_MAX_BYTES,
    parts: 2,
  },
}).single(IMAGE_FIELD);

function translated(error: MulterError): Error {
  switch (error.code) {
    case "LIMIT_FILE_SIZE":
      return new InvalidImageError("size", "single");
    case "LIMIT_FIELD_VALUE":
      return error.field === ALT_TEXT_FIELD
        ? new InvalidImageError("altText", "single")
        : formError(IMAGE_FIELD, "Mandá solo la imagen y su texto alternativo.");
    case "LIMIT_FILE_COUNT":
    case "LIMIT_UNEXPECTED_FILE":
      return formError(IMAGE_FIELD, "Mandá una sola imagen, en el campo image.");
    default:
      return formError(IMAGE_FIELD, "Mandá solo la imagen y su texto alternativo.");
  }
}

/**
 * Reads a `multipart/form-data` image: one file in `image`, kept in memory and never more than
 * 10 MB, and its optional `altText`, which stays as the body for the usual validation.
 */
@Injectable()
export class ProductImageFormInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    // Interceptors run before the route pipes: an id that names no product is a 404 before
    // any file is read.
    const { productId } = context.switchToHttp().getRequest<Request>().params;
    await PRODUCT_ID.transform(productId, { type: "param", data: "productId" });
    const request = await readMultipart(context, parse, IMAGE_FIELD, translated);
    if (!request.file) {
      throw formError(IMAGE_FIELD, "Elegí una imagen para subir.");
    }
    return next.handle();
  }
}
