import type { Clock } from "../../../../shared/application/clock.js";
import type { IdGenerator } from "../../../../shared/application/id-generator.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import { User } from "../../domain/entities/user.js";
import { EmailAlreadyInUseError } from "../../domain/errors/email-already-in-use-error.js";
import type { UserRepository } from "../../domain/repositories/user.repository.js";
import { Email } from "../../domain/value-objects/email.js";
import { Password } from "../../domain/value-objects/password.js";
import { UserName } from "../../domain/value-objects/user-name.js";
import type { CreateUserCommand } from "../dto/create-user.command.js";
import type { UserResult } from "../dto/user.result.js";
import { UserNotFoundError } from "../errors/user-not-found-error.js";
import type { PasswordHasher } from "../ports/password-hasher.js";
import type { UserQueries } from "../ports/user-queries.js";

/**
 * An admin creates a panel user with a password of their choosing, which the new user must
 * replace on the first login. No mail is sent: the admin hands the password over.
 */
export class CreateUserUseCase implements UseCase<CreateUserCommand, UserResult> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly ids: IdGenerator,
    private readonly queries: UserQueries,
    private readonly clock: Clock,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserResult> {
    const email = Email.create(command.email);
    const name = UserName.create(command.name);
    const password = Password.create(command.temporaryPassword);
    // Two creations at once with the same email are stopped by the unique index instead.
    if (await this.users.existsByEmail(email)) {
      throw new EmailAlreadyInUseError();
    }

    const user = User.create({
      id: this.ids.next(),
      email,
      name,
      passwordHash: await this.hasher.hash(password),
      role: command.role,
      createdBy: command.actorId,
      now: this.clock.now(),
    });
    await this.users.save(user);

    const created = await this.queries.findById(user.getId());
    if (!created) {
      throw new UserNotFoundError();
    }
    return created;
  }
}
