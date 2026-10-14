import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../../../shared/infrastructure/database/drizzle.client.js";
import { users } from "../../../shared/infrastructure/database/schema/index.js";
import type { PasswordHasher } from "../application/ports/password-hasher.js";

export const seedAdminInputSchema = z.object({
  SEED_ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
  SEED_ADMIN_NAME: z.string().trim().min(1).max(120),
  SEED_ADMIN_PASSWORD: z.string().min(8).max(128),
});

export type SeedAdminInput = z.infer<typeof seedAdminInputSchema>;
export type SeedAdminResult = "created" | "already-exists";

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
      email: input.SEED_ADMIN_EMAIL,
      name: input.SEED_ADMIN_NAME,
      passwordHash,
      role: "ADMIN",
      mustChangePassword: true,
    });
    return "created";
  });
}
