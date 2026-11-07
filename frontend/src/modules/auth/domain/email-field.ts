import { z } from "zod";

import { authContent } from "../content/auth";

const { emailRequired, emailInvalid } = authContent.errors;

/** An email typed in a form: surrounding spaces are dropped before it is checked. */
export const emailSchema = z.string().trim().min(1, emailRequired).pipe(z.email(emailInvalid));
