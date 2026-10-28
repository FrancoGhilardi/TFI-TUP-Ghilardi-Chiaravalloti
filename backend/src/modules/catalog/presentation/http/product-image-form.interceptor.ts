import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import type { Request, RequestHandler } from "express";
import multer, { type MulterError } from "multer";
import type { Observable } from "rxjs";
import { IMAGE_ALT_TEXT_MAX_LENGTH, PRODUCT_IMAGE_MAX_BYTES } from "../../domain/catalog-limits.js";
import { InvalidImageError } from "../../domain/errors/invalid-image-error.js";
import { IMAGE_ID } from "./image-id.pipe.js";
import { formError, readMultipart } from "./multipart-form.js";
import { PRODUCT_ID } from "./product-id.pipe.js";

export const IMAGE_FIELD = "image";
const ALT_TEXT_FIELD = "altText";

// Enough for the longest alt text, even if every character took four bytes.
const ALT_TEXT_MAX_BYTES = IMAGE_ALT_TEXT_MAX_LENGTH * 4;

const ONE_FILE = "Mandá una sola imagen, en el campo image.";

const parserOf = (fields: number) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: PRODUCT_IMAGE_MAX_BYTES,
      files: 1,
      fields,
      fieldSize: ALT_TEXT_MAX_BYTES,
      parts: fields + 1,
    },
  }).single(IMAGE_FIELD);

/** The errors both forms share; `otherFields` tells what the form takes besides the file. */
function translatedWith(otherFields: string) {
  return (error: MulterError): Error => {
    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        return new InvalidImageError("size", "single");
      case "LIMIT_FILE_COUNT":
      case "LIMIT_UNEXPECTED_FILE":
        return formError(IMAGE_FIELD, ONE_FILE);
      default:
        return formError(IMAGE_FIELD, otherFields);
    }
  };
}

const withAltText = translatedWith("Mandá solo la imagen y su texto alternativo.");

/**
 * Reads a `multipart/form-data` image: one file in `image`, kept in memory and never more than
 * 10 MB. Interceptors run before the route pipes, so an id in the route that names no product
 * or image is a 404 before any file is read.
 */
abstract class ImageFormInterceptor implements NestInterceptor {
  protected constructor(
    private readonly parse: RequestHandler,
    private readonly translate: (error: MulterError) => Error,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const { productId, imageId } = context.switchToHttp().getRequest<Request>().params;
    await PRODUCT_ID.transform(productId, { type: "param", data: "productId" });
    if (imageId !== undefined) {
      await IMAGE_ID.transform(imageId, { type: "param", data: "imageId" });
    }
    const request = await readMultipart(context, this.parse, IMAGE_FIELD, this.translate);
    if (!request.file) {
      throw formError(IMAGE_FIELD, "Elegí una imagen para subir.");
    }
    return next.handle();
  }
}

/** A new image with its optional `altText`, which stays as the body for the usual validation. */
@Injectable()
export class ProductImageFormInterceptor extends ImageFormInterceptor {
  constructor() {
    super(parserOf(1), (error) =>
      error.code === "LIMIT_FIELD_VALUE" && error.field === ALT_TEXT_FIELD
        ? new InvalidImageError("altText", "single")
        : withAltText(error),
    );
  }
}

/** A new file for an existing image, alone: no text field is taken. */
@Injectable()
export class ImageFileFormInterceptor extends ImageFormInterceptor {
  constructor() {
    super(parserOf(0), translatedWith("Mandá solo la imagen nueva, en el campo image."));
  }
}
