import { CLIENT_ERROR_CODES } from "./api-error";

/** Overrides of the user-facing message per error code, set by the module making the call. */
export type ErrorMessageOverrides = Partial<Record<string, string>>;

const DEFAULT_MESSAGE = "Ocurrió un error inesperado. Intentá de nuevo en unos minutos.";
const TIMEOUT_MESSAGE = "El servidor tardó demasiado en responder. Intentá de nuevo.";
const UNAVAILABLE_ACTION_MESSAGE = "Esta acción no está disponible.";

/**
 * Codes the API uses for generic HTTP errors, plus the ones the client detects itself. Their
 * message may be technical or in English, so a Spanish one is shown instead. Any other code is
 * a domain error whose message the API already writes for the user.
 */
const FALLBACK_MESSAGES: Record<string, string> = {
  BAD_REQUEST: "La solicitud no es válida. Revisá los datos e intentá de nuevo.",
  UNAUTHORIZED: "Tu sesión no es válida o venció. Iniciá sesión de nuevo.",
  FORBIDDEN: "No tenés permiso para realizar esta acción.",
  NOT_FOUND: "No encontramos lo que buscabas.",
  METHOD_NOT_ALLOWED: UNAVAILABLE_ACTION_MESSAGE,
  NOT_ACCEPTABLE: UNAVAILABLE_ACTION_MESSAGE,
  REQUEST_TIMEOUT: TIMEOUT_MESSAGE,
  CONFLICT: "La operación entra en conflicto con datos existentes. Revisá la información.",
  GONE: "Lo que buscabas ya no está disponible.",
  PAYLOAD_TOO_LARGE: "El archivo o los datos enviados son demasiado grandes.",
  UNSUPPORTED_MEDIA_TYPE: "El formato del archivo no es compatible.",
  UNPROCESSABLE_ENTITY: "No se pudo completar la operación con los datos enviados.",
  TOO_MANY_REQUESTS: "Hiciste demasiados intentos. Esperá un momento y probá de nuevo.",
  INTERNAL_ERROR: DEFAULT_MESSAGE,
  BAD_GATEWAY: "Un servicio externo no respondió. Intentá de nuevo en unos minutos.",
  SERVICE_UNAVAILABLE: "El servicio no está disponible en este momento. Intentá más tarde.",
  GATEWAY_TIMEOUT: TIMEOUT_MESSAGE,
  HTTP_ERROR: DEFAULT_MESSAGE,
  [CLIENT_ERROR_CODES.unexpectedResponse]: DEFAULT_MESSAGE,
  [CLIENT_ERROR_CODES.network]: "No pudimos conectarnos. Revisá tu conexión a internet.",
  [CLIENT_ERROR_CODES.timeout]: TIMEOUT_MESSAGE,
};

/** Message to show for an error: the caller's override, then the API's own text, then a fallback. */
export function resolveErrorMessage(
  code: string,
  apiMessage: string | undefined,
  overrides?: ErrorMessageOverrides,
): string {
  const override = overrides?.[code];
  if (override !== undefined) {
    return override;
  }
  const fallback = FALLBACK_MESSAGES[code];
  if (fallback !== undefined) {
    return fallback;
  }
  return apiMessage || DEFAULT_MESSAGE;
}
