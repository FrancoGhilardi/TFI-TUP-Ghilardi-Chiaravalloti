import { z } from "zod";

import { authContent } from "../content/auth";
import { emailSchema } from "./email-field";

/** What the sign-in form asks for. The password is sent as typed, not trimmed. */
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, authContent.errors.passwordRequired),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
