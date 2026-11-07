import { z } from "zod";

import { authContent } from "../content/auth";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "./password-rules";

const { errors } = authContent.changePassword;

/**
 * What the form to change the own password asks for. Passwords are never trimmed: spaces are
 * part of them.
 */
export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, errors.currentRequired),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, errors.newTooShort)
      .max(PASSWORD_MAX_LENGTH, errors.newTooLong),
    confirmPassword: z.string().min(1, errors.confirmRequired),
  })
  .superRefine(({ currentPassword, newPassword, confirmPassword }, context) => {
    if (confirmPassword.length > 0 && confirmPassword !== newPassword) {
      context.addIssue({ code: "custom", path: ["confirmPassword"], message: errors.mismatch });
    }
    if (newPassword.length > 0 && newPassword === currentPassword) {
      context.addIssue({ code: "custom", path: ["newPassword"], message: errors.sameAsCurrent });
    }
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;
