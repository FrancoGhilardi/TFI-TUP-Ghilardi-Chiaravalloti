import type { users } from "../../../../shared/infrastructure/database/schema/index.js";
import { User } from "../../domain/entities/user.js";
import { UserRole } from "../../domain/user-role.js";
import { Email } from "../../domain/value-objects/email.js";
import { TemporaryPassword } from "../../domain/value-objects/temporary-password.js";
import { UserName } from "../../domain/value-objects/user-name.js";

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

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
      name: UserName.fromPersisted(row.name),
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

  toPersistence(user: User): NewUserRow {
    return {
      id: user.getId(),
      email: user.email.toString(),
      name: user.name.toString(),
      passwordHash: user.passwordHash,
      role: user.role,
      isActive: user.active,
      mustChangePassword: user.mustChangePassword,
      temporaryPasswordHash: user.temporaryPassword?.hash ?? null,
      temporaryPasswordExpiresAt: user.temporaryPassword?.expiresAt ?? null,
      passwordChangedAt: user.passwordChangedAt ?? null,
      lastLoginAt: user.lastLoginAt ?? null,
      createdBy: user.createdBy ?? null,
      updatedBy: user.updatedBy ?? null,
      deletedBy: user.deletedBy ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt ?? null,
    };
  },
};
