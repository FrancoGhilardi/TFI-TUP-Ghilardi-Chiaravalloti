import {
  BusinessRuleViolationError,
  ConflictError,
  DomainError,
  InvalidValueError,
} from "../../../../shared/domain/errors/index.js";
import { DeletedUserError } from "./deleted-user-error.js";
import { EmailAlreadyInUseError } from "./email-already-in-use-error.js";
import { InvalidUserNameError } from "./invalid-user-name-error.js";
import { LastActiveAdminError } from "./last-active-admin-error.js";
import { SelfAdministrationError } from "./self-administration-error.js";
import { TemporaryPasswordUnavailableError } from "./temporary-password-unavailable-error.js";
import { UserNotDeletedError } from "./user-not-deleted-error.js";

// The base class decides the HTTP status: ConflictError 409, BusinessRuleViolationError 422,
// InvalidValueError 400.
describe("identity errors", () => {
  it.each<[DomainError, typeof DomainError, string, string]>([
    [
      new EmailAlreadyInUseError(),
      ConflictError,
      "EMAIL_ALREADY_IN_USE",
      "Ya existe un usuario con ese email.",
    ],
    [
      new SelfAdministrationError(),
      BusinessRuleViolationError,
      "SELF_ADMINISTRATION",
      "No podés cambiar tu propio rol, desactivarte ni darte de baja.",
    ],
    [
      new LastActiveAdminError(),
      BusinessRuleViolationError,
      "LAST_ACTIVE_ADMIN",
      "Tiene que quedar al menos un administrador activo.",
    ],
    [
      new UserNotDeletedError(),
      BusinessRuleViolationError,
      "USER_NOT_DELETED",
      "El usuario no está dado de baja.",
    ],
    [
      new DeletedUserError(),
      BusinessRuleViolationError,
      "USER_DELETED",
      "El usuario está dado de baja. Reactivalo antes de modificarlo.",
    ],
    [
      new TemporaryPasswordUnavailableError(),
      BusinessRuleViolationError,
      "TEMPORARY_PASSWORD_UNAVAILABLE",
      "La clave temporal venció o ya fue usada.",
    ],
    [
      new InvalidUserNameError(),
      InvalidValueError,
      "INVALID_USER_NAME",
      "El nombre no puede estar vacío ni tener más de 120 caracteres.",
    ],
  ])("%s has its base, code and message", (error, base, code, message) => {
    expect(error).toBeInstanceOf(base);
    expect(error).toMatchObject({ code, message, name: error.constructor.name });
  });
});
