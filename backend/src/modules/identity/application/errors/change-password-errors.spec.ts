import {
  BusinessRuleViolationError,
  InvalidValueError,
} from "../../../../shared/domain/errors/index.js";
import { InvalidCurrentPasswordError } from "./invalid-current-password-error.js";
import { PasswordUnchangedError } from "./password-unchanged-error.js";

describe("Change password errors", () => {
  it("answers a wrong current password with 400, not as an expired session", () => {
    const error = new InvalidCurrentPasswordError();

    expect(error).toBeInstanceOf(InvalidValueError);
    expect(error).toMatchObject({
      code: "INVALID_CURRENT_PASSWORD",
      message: "La contraseña actual no es correcta.",
    });
  });

  it("answers an unchanged password as a broken business rule", () => {
    const error = new PasswordUnchangedError();

    expect(error).toBeInstanceOf(BusinessRuleViolationError);
    expect(error).toMatchObject({
      code: "PASSWORD_UNCHANGED",
      message: "La nueva contraseña tiene que ser distinta de la actual.",
    });
  });
});
