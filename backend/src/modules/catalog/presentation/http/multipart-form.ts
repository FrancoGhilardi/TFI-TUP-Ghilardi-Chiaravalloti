import type { ExecutionContext } from "@nestjs/common";
import type { Request, RequestHandler, Response } from "express";
import { MulterError } from "multer";
import { RequestValidationError } from "../../../../shared/presentation/http/request-validation-error.js";

export const formError = (field: string, message: string) =>
  new RequestValidationError([{ field, messages: [message] }]);

/**
 * Runs a multer `handler` on the request of `context`. A multer error becomes what `translate`
 * makes of it; anything else, such as a body cut on the way, asks to send the form again.
 */
export async function readMultipart(
  context: ExecutionContext,
  handler: RequestHandler,
  field: string,
  translate: (error: MulterError) => Error,
): Promise<Request> {
  const http = context.switchToHttp();
  const request = http.getRequest<Request>();
  await new Promise<void>((resolve, reject) => {
    handler(request, http.getResponse<Response>(), (error: unknown) => {
      if (!error) {
        resolve();
      } else if (error instanceof MulterError) {
        reject(translate(error));
      } else {
        reject(formError(field, "No pudimos leer el formulario. Probá de nuevo."));
      }
    });
  });
  return request;
}
