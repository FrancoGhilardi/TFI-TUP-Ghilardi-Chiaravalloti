import { ApiError } from "./api-error";

export interface FieldErrorTables<Field extends string> {
  /** Fields that `VALIDATION_FAILED` names, by their name in the request. */
  fieldOfName: Record<string, Field>;
  /** Fields that the domain errors are about, by their `code`. */
  fieldOfCode: Record<string, Field>;
  /** For a failure that is not the API's, so there is nothing of its own to show. */
  fallback: string;
}

export interface ServerFieldErrors<Field extends string> {
  /** The server's message for each field it refused. */
  fields: Partial<Record<Field, string>>;
  /** What could not be tied to a field (and a failure that is not the API's). */
  general?: string;
}

/** Splits `relatedProductIds.1` or `imageAltTexts[0]` into the name the API uses for the field. */
const rootOf = (path: string): string => path.split(/[.[]/)[0];

/**
 * Where the server's refusal of a form belongs: the fields it names (by the details of
 * `VALIDATION_FAILED` or by the error's code) with its own message, and whatever has no field as
 * `general`.
 */
export function serverFieldErrors<Field extends string>(
  error: unknown,
  { fieldOfName, fieldOfCode, fallback }: FieldErrorTables<Field>,
): ServerFieldErrors<Field> {
  if (!(error instanceof ApiError)) {
    return { fields: {}, general: fallback };
  }

  const fields: ServerFieldErrors<Field>["fields"] = {};
  const orphans: string[] = [];
  const place = (field: Field | undefined, message: string) => {
    if (!field) {
      orphans.push(message);
    } else if (!fields[field]) {
      fields[field] = message;
    }
  };

  const byField = error.fieldErrors();
  if (Object.keys(byField).length > 0) {
    for (const [path, messages] of Object.entries(byField)) {
      place(fieldOfName[rootOf(path)], messages.join(" "));
    }
  } else {
    place(fieldOfCode[error.code], error.message);
  }

  return orphans.length > 0 ? { fields, general: orphans.join(" ") } : { fields };
}
