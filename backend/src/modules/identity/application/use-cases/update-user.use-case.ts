import type { Clock } from "../../../../shared/application/clock.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { User } from "../../domain/entities/user.js";
import { DeletedUserError } from "../../domain/errors/deleted-user-error.js";
import { EmailAlreadyInUseError } from "../../domain/errors/email-already-in-use-error.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import type { UserAdministrationPolicy } from "../../domain/services/user-administration.policy.js";
import { Email } from "../../domain/value-objects/email.js";
import { UserName } from "../../domain/value-objects/user-name.js";
import type { UpdateUserCommand } from "../dto/update-user.command.js";
import type { UserResult } from "../dto/user.result.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";
import type { UserQueries } from "../ports/user-queries.js";

/**
 * An admin edits a user's email, name, role or status. No admin can take away their own role
 * or status, and the system never runs out of active admins. A deleted user cannot be edited,
 * only restored, and a change that leaves everything as it was saves nothing.
 */
export class UpdateUserUseCase implements UseCase<UpdateUserCommand, UserResult> {
  constructor(
    private readonly users: UserRepository,
    private readonly policy: UserAdministrationPolicy,
    private readonly queries: UserQueries,
    private readonly transaction: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async execute(command: UpdateUserCommand): Promise<UserResult> {
    // Checked before the transaction, so a malformed value never opens one.
    const email = command.email === undefined ? undefined : Email.create(command.email);
    const name = command.name === undefined ? undefined : UserName.create(command.name);

    await this.transaction.run(async () => {
      const user = await this.users.findById(command.userId);
      if (!user) {
        throw new UserNotFoundError();
      }
      if (user.isDeleted()) {
        throw new DeletedUserError();
      }
      const now = this.clock.now();
      const before = snapshot(user);

      if (email && !email.equals(user.email)) {
        if (await this.users.existsByEmail(email, user.getId())) {
          throw new EmailAlreadyInUseError();
        }
        user.changeEmail(email, command.actorId, now);
      }
      if (name) {
        user.rename(name, command.actorId, now);
      }
      await this.applyRoleAndStatus(user, command, now);

      // Saving an untouched user would still stamp updated_at in the database.
      if (snapshot(user) !== before) {
        await this.users.save(user);
      }
    });

    const updated = await this.queries.findById(command.userId);
    if (!updated) {
      throw new UserNotFoundError();
    }
    return updated;
  }

  private async applyRoleAndStatus(user: User, command: UpdateUserCommand, now: Date) {
    const { role, isActive, actorId } = command;
    if (role === undefined && isActive === undefined) {
      return;
    }
    // Only an active admin can be the last one, so only then are the others counted, with
    // the user locked; two admins demoting each other at once are still stopped by the
    // database trigger that keeps an active admin.
    const otherActiveAdmins = user.isActiveAdmin()
      ? await this.users.countOtherActiveAdmins(user.getId())
      : 0;
    if (role !== undefined) {
      this.policy.assertCanChangeRole(actorId, user, role, otherActiveAdmins);
      user.changeRole(role, actorId, now);
    }
    if (isActive === true) {
      user.activate(actorId, now);
    } else if (isActive === false) {
      this.policy.assertCanDeactivate(actorId, user, otherActiveAdmins);
      user.deactivate(actorId, now);
    }
  }
}

/** What an edit can change, to tell whether it changed anything. */
function snapshot(user: User): string {
  return JSON.stringify([user.email.toString(), user.name.toString(), user.role, user.active]);
}
