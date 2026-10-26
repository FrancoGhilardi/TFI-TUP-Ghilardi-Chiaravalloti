import { EntityNotFoundError } from "../../../../shared/domain/errors/index.js";

export class UserNotFoundError extends EntityNotFoundError {
  constructor() {
    super("USER_NOT_FOUND", "No encontramos el usuario.");
  }
}
