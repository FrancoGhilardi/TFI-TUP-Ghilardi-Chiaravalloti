import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../../../shared/infrastructure/database/drizzle.client.js";
import { users } from "../../../shared/infrastructure/database/schema/index.js";
import type { PasswordHasher } from "../application/ports/password-hasher.js";
import { InvalidEmailError } from "../domain/errors/invalid-email-error.js";
import { InvalidPasswordError } from "../domain/errors/invalid-password-error.js";
import { Email } from "../domain/value-objects/email.js";
import { Password } from "../domain/value-objects/password.js";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "../domain/value-objects/password-policy.js";

// The domain value objects decide; the messages are in English because the seed is run by
// an operator, not shown to end users (D31).
const PASSWORD_MESSAGES = {
  length: `Must have between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
  characters: "Contains characters that are not valid Unicode",
} as const;

export const seedAdminInputSchema = z.object({
  SEED_ADMIN_EMAIL: z
    .string()
    .trim()
    .transform((value, ctx) => {
      try {
        return Email.create(value);
      } catch (error) {
        if (!(error instanceof InvalidEmailError)) {
          throw error;
        }
        ctx.addIssue({ code: "custom", message: "Invalid email address" });
        return z.NEVER;
      }
    }),
  SEED_ADMIN_NAME: z.string().trim().min(1).max(120),
  SEED_ADMIN_PASSWORD: z.string().transform((plain, ctx) => {
    try {
      return Password.create(plain);
    } catch (error) {
      if (!(error instanceof InvalidPasswordError)) {
        throw error;
      }
      ctx.addIssue({ code: "custom", message: PASSWORD_MESSAGES[error.reason] });
      return z.NEVER;
    }
  }),
});

export type SeedAdminInput = z.infer<typeof seedAdminInputSchema>;
export type SeedAdminResult = "created" | "already-exists";

/** Creates the first admin, who must change the password on first login. Does nothing if an active admin exists. */
export async function seedAdmin(
  db: Database,
  hasher: PasswordHasher,
  input: SeedAdminInput,
): Promise<SeedAdminResult> {
  // Hashing is slow; do it before the transaction so the connection is not held idle meanwhile.
  const passwordHash = await hasher.hash(input.SEED_ADMIN_PASSWORD);

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "ADMIN"), eq(users.isActive, true), isNull(users.deletedAt)))
      .limit(1);
    if (existing) {
      return "already-exists";
    }

    await tx.insert(users).values({
      email: input.SEED_ADMIN_EMAIL.toString(),
      name: input.SEED_ADMIN_NAME,
      passwordHash,
      role: "ADMIN",
      mustChangePassword: true,
    });
    return "created";
  });
}
