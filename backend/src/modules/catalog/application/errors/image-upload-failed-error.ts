import { ExternalServiceError } from "../../../../shared/domain/errors/index.js";

/** The file storage did not take an image; the failure it reported is the `cause`. */
export class ImageUploadFailedError extends ExternalServiceError {
  constructor(cause: unknown) {
    super("IMAGE_UPLOAD_FAILED", "No se pudieron subir las imágenes. Probá de nuevo.", { cause });
  }
}
