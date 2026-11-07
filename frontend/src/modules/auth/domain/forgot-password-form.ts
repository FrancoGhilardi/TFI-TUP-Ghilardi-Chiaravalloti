import { z } from "zod";

import { emailSchema } from "./email-field";

/** What the form to ask for a temporary password needs. */
export const forgotPasswordFormSchema = z.object({ email: emailSchema });

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;
