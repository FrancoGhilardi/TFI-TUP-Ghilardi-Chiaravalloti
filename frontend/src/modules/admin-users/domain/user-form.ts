import { z } from "zod";

import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  userFormErrors as errors,
} from "../content/users";
import type { AdminUserRow } from "./admin-user";

const length = (text: string) => [...text].length;

/** Same rule as the API's: something before and after an `@`, and a dot in the domain. */
const EMAIL_FORMAT = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const shape = z.object({
  name: z.string(),
  email: z.string(),
  /** `ADMIN` or `SELLER`; empty while none was chosen. */
  role: z.string(),
  /** Only when creating; kept as typed, since spaces are part of a password. */
  temporaryPassword: z.string(),
  passwordConfirmation: z.string(),
  isActive: z.boolean(),
});

export type UserFormValues = z.infer<typeof shape>;
export type UserFormField = keyof UserFormValues;
export type UserFormMode = "create" | "edit";

export const EMPTY_USER_FORM: UserFormValues = {
  name: "",
  email: "",
  role: "",
  temporaryPassword: "",
  passwordConfirmation: "",
  isActive: true,
};

/** The rules of the form: what the browser checks before anything is sent. */
export const userFormSchema = (mode: UserFormMode) =>
  shape.superRefine((values, context) => {
    const fail = (path: UserFormField, message: string) =>
      context.addIssue({ code: "custom", path: [path], message });

    const name = values.name.trim();
    if (name === "") {
      fail("name", errors.name.required);
    } else if (length(name) > NAME_MAX_LENGTH) {
      fail("name", errors.name.tooLong);
    }

    const email = values.email.trim();
    if (email === "") {
      fail("email", errors.email.required);
    } else if (!EMAIL_FORMAT.test(email)) {
      fail("email", errors.email.invalid);
    } else if (length(email) > EMAIL_MAX_LENGTH) {
      fail("email", errors.email.tooLong);
    }

    if (values.role !== "ADMIN" && values.role !== "SELLER") {
      fail("role", errors.role);
    }

    if (mode === "edit") {
      return;
    }
    const size = length(values.temporaryPassword);
    if (values.temporaryPassword === "") {
      fail("temporaryPassword", errors.temporaryPassword.required);
    } else if (size < PASSWORD_MIN_LENGTH || size > PASSWORD_MAX_LENGTH) {
      fail("temporaryPassword", errors.temporaryPassword.length);
    }
    if (values.passwordConfirmation === "") {
      fail("passwordConfirmation", errors.passwordConfirmation.required);
    } else if (values.passwordConfirmation !== values.temporaryPassword) {
      fail("passwordConfirmation", errors.passwordConfirmation.mismatch);
    }
  });

/** The values a user has when its form opens for editing. */
export function initialValuesOf(user: AdminUserRow): UserFormValues {
  return {
    ...EMPTY_USER_FORM,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}
