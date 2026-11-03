import { z } from "zod";

import { authContent } from "../content/auth";

const { emailRequired, emailInvalid, passwordRequired } = authContent.errors;

/** What the sign-in form asks for. The password is sent as typed, not trimmed. */
export const loginFormSchema = z.object({
  email: z.string().trim().min(1, emailRequired).pipe(z.email(emailInvalid)),
  password: z.string().min(1, passwordRequired),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
