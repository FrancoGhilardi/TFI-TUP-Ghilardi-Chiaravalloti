import { type ServerFieldErrors, serverFieldErrors } from "@/modules/core/http";

import { userFormErrors } from "../content/users";
import type { UserFormField } from "./user-form";

/** Fields of the form the server can complain about, in the order they appear on the screen. */
export const ERROR_FIELD_ORDER = [
  "name",
  "email",
  "role",
  "isActive",
  "temporaryPassword",
] as const satisfies readonly UserFormField[];

export type ErrorField = (typeof ERROR_FIELD_ORDER)[number];

export type ServerErrors = ServerFieldErrors<ErrorField>;

/** Fields the API names in `VALIDATION_FAILED`, by their name in the request. */
const FIELD_OF_NAME: Record<string, ErrorField> = {
  name: "name",
  email: "email",
  role: "role",
  isActive: "isActive",
  temporaryPassword: "temporaryPassword",
};

/** Fields that the API's domain errors are about, by their `code`. */
const FIELD_OF_CODE: Record<string, ErrorField> = {
  INVALID_USER_NAME: "name",
  INVALID_EMAIL: "email",
  EMAIL_ALREADY_IN_USE: "email",
  INVALID_PASSWORD: "temporaryPassword",
};

/** What the request changed that the rules about admins may refuse. */
interface SentChanges {
  role?: unknown;
}

/**
 * Where the server's refusal of a form belongs: its fields with its own message, the rest general.
 * The rules that protect admins name no field, so they go to the role when the request changed it
 * and to the state otherwise.
 */
export function serverErrorsOf(error: unknown, sent: SentChanges = {}): ServerErrors {
  const adminRuleField: ErrorField = sent.role === undefined ? "isActive" : "role";
  return serverFieldErrors<ErrorField>(error, {
    fieldOfName: FIELD_OF_NAME,
    fieldOfCode: {
      ...FIELD_OF_CODE,
      SELF_ADMINISTRATION: adminRuleField,
      LAST_ACTIVE_ADMIN: adminRuleField,
    },
    fallback: userFormErrors.fallback,
  });
}
