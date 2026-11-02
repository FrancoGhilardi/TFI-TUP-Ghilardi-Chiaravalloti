import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import multer, { type MulterError } from "multer";
import type { Observable } from "rxjs";
import { RequestValidationError } from "../../../../shared/presentation/http/request-validation-error.js";
import { PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGES_MAX } from "../../domain/catalog-limits.js";
import { InvalidImageCountError } from "../../domain/errors/invalid-image-count-error.js";
import { InvalidImageError } from "../../domain/errors/invalid-image-error.js";
import { formError, readMultipart } from "./multipart-form.js";

export const IMAGES_FIELD = "images";
export const DATA_FIELD = "data";

// Far above any real product, and enough to keep a huge text field out of memory.
const DATA_MAX_BYTES = 100 * 1024;

const parse = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: PRODUCT_IMAGE_MAX_BYTES,
    files: PRODUCT_IMAGES_MAX,
    fields: 1,
    fieldSize: DATA_MAX_BYTES,
    parts: PRODUCT_IMAGES_MAX + 1,
  },
}).array(IMAGES_FIELD, PRODUCT_IMAGES_MAX);

const invalidData = (message: string) => formError(DATA_FIELD, message);

/** Every way the form can break, told as the errors the panel already knows. */
function translated(error: MulterError): Error {
  switch (error.code) {
    case "LIMIT_FILE_SIZE":
      return new InvalidImageError("size");
    case "LIMIT_FILE_COUNT":
    case "LIMIT_UNEXPECTED_FILE":
      return new InvalidImageCountError();
    default:
      return invalidData("Mandá solo los datos del producto en el campo data y las imágenes.");
  }
}

/**
 * Reads a `multipart/form-data` product: up to 5 files in `images`, kept in memory, and the
 * product as JSON text in `data`, which then replaces the body so the usual validation of the
 * route applies to it.
 */
@Injectable()
export class ProductFormInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = await readMultipart(context, parse, DATA_FIELD, translated);
    const files = (request.files as Express.Multer.File[] | undefined) ?? [];
    request.files = files;
    request.body = productData(
      (request.body as Record<string, unknown> | undefined)?.[DATA_FIELD],
      files.length,
    );
    return next.handle();
  }
}

function productData(raw: unknown, fileCount: number): unknown {
  if (typeof raw !== "string") {
    throw invalidData("Mandá los datos del producto en el campo data.");
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw invalidData("Los datos del producto no son un JSON válido.");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw invalidData("Los datos del producto tienen que ser un objeto JSON.");
  }
  const { imageAltTexts } = data as { imageAltTexts?: unknown };
  if (Array.isArray(imageAltTexts) && imageAltTexts.length > fileCount) {
    throw new RequestValidationError([
      { field: "imageAltTexts", messages: ["Hay más textos alternativos que imágenes."] },
    ]);
  }
  return data;
}
