import { Injectable } from "@nestjs/common";
import { and, count, eq, isNull, ne, type SQL } from "drizzle-orm";
import { DrizzleExecutor } from "../../../../shared/infrastructure/database/drizzle.executor.js";
import { users } from "../../../../shared/infrastructure/database/schema/index.js";
import {
  isCheckViolation,
  isUniqueViolation,
} from "../../../../shared/infrastructure/database/constraint-violation.js";
import type { User } from "../../domain/entities/user.js";
import { EmailAlreadyInUseError } from "../../domain/errors/email-already-in-use-error.js";
import { LastActiveAdminError } from "../../domain/errors/last-active-admin-error.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import type { Email } from "../../domain/value-objects/email.js";
import { UserMapper } from "./user.mapper.js";

const EMAIL_INDEX = "uq_users_email_not_deleted";
// Named by the trigger that keeps an active admin.
const LAST_ADMIN_RULE = "chk_users_last_active_admin";

// "Current" users are the ones not deleted, as in the unique email index.
const isCurrent = isNull(users.deletedAt);

@Injectable()
export class DrizzleUserRepository extends UserRepository {
  constructor(private readonly executor: DrizzleExecutor) {
    super();
  }

  async findById(id: string): Promise<User | null> {
    return this.findOne(eq(users.id, id));
  }

  // The email column is citext, so the comparison ignores case.
  async findByEmail(email: Email): Promise<User | null> {
    return this.findOne(and(eq(users.email, email.toString()), isCurrent));
  }

  async existsByEmail(email: Email, excludeId?: string): Promise<boolean> {
    const [row] = await this.executor
      .current()
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.email, email.toString()),
          isCurrent,
          excludeId === undefined ? undefined : ne(users.id, excludeId),
        ),
      )
      .limit(1);
    return row !== undefined;
  }

  async countOtherActiveAdmins(excludeId: string): Promise<number> {
    const [row] = await this.executor
      .current()
      .select({ total: count() })
      .from(users)
      .where(
        and(eq(users.role, "ADMIN"), eq(users.isActive, true), isCurrent, ne(users.id, excludeId)),
      );
    return row?.total ?? 0;
  }

  async save(user: User): Promise<void> {
    const row = UserMapper.toPersistence(user);
    // Who created the user and when never changes after the insert.
    const changes: Partial<typeof row> = { ...row };
    delete changes.id;
    delete changes.createdAt;
    delete changes.createdBy;
    try {
      await this.executor
        .current()
        .insert(users)
        .values(row)
        .onConflictDoUpdate({ target: users.id, set: changes });
    } catch (error) {
      // Two saves at once with the same email pass the existsByEmail check; the index stops
      // the second, which is the same conflict.
      if (isUniqueViolation(error, EMAIL_INDEX)) {
        throw new EmailAlreadyInUseError();
      }
      // Two admins removing each other at once both pass the count; the trigger stops one.
      if (isCheckViolation(error, LAST_ADMIN_RULE)) {
        throw new LastActiveAdminError();
      }
      throw error;
    }
  }

  /**
   * `save` writes the whole row, so inside a transaction the row is locked when read: a
   * concurrent change (a deletion, a deactivation) waits instead of being overwritten by a
   * stale copy. Reads outside a transaction, like the one of every authenticated request,
   * take no lock.
   */
  private async findOne(where: SQL | undefined): Promise<User | null> {
    const query = this.executor.current().select().from(users).where(where).limit(1);
    const [row] = this.executor.hasActiveTransaction() ? await query.for("update") : await query;
    return row ? UserMapper.toDomain(row) : null;
  }
}
