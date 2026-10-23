import { AuthenticationError } from "../../../../shared/domain/errors/index.js";
import { InvalidSessionError } from "./invalid-session-error.js";

describe("InvalidSessionError", () => {
  it("is an authentication error, so it answers 401", () => {
    expect(new InvalidSessionError()).toBeInstanceOf(AuthenticationError);
  });

  it("has a stable code and a message for the user", () => {
    expect(new InvalidSessionError()).toMatchObject({
      code: "INVALID_SESSION",
      message: "Tu sesión terminó. Iniciá sesión de nuevo.",
    });
  });
});
