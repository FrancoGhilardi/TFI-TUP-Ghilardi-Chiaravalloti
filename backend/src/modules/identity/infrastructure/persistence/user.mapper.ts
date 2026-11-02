import type { users } from "../../../../shared/infrastructure/database/schema/index.js";
import { User } from "../../domain/entities/user.js";
import { UserRole } from "../../domain/user-role.js";
import { Email } from "../../domain/value-objects/email.js";
import { TemporaryPassword } from "../../domain/value-objects/temporary-password.js";

export type UserRow = typeof users.$inferSelect;

/** Translates between the `users` table and the `User` entity. */
export const UserMapper = {
  toDomain(row: UserRow): User {
    const temporaryPassword =
      row.temporaryPasswordHash !== null && row.temporaryPasswordExpiresAt !== null
        ? new TemporaryPassword(row.temporaryPasswordHash, row.temporaryPasswordExpiresAt)
        : undefined;

    return User.reconstitute({
      id: row.id,
      email: Email.fromPersisted(row.email),
      name: row.name,
      passwordHash: row.passwordHash,
      role: UserRole[row.role],
      active: row.isActive,
      mustChangePassword: row.mustChangePassword,
      temporaryPassword,
      passwordChangedAt: row.passwordChangedAt ?? undefined,
      lastLoginAt: row.lastLoginAt ?? undefined,
      createdBy: row.createdBy ?? undefined,
      updatedBy: row.updatedBy ?? undefined,
      deletedBy: row.deletedBy ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? undefined,
    });
  },
};
