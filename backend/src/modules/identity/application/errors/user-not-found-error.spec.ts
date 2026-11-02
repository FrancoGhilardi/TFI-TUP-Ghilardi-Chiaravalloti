import { EntityNotFoundError } from "../../../../shared/domain/errors/index.js";
import { UserNotFoundError } from "./user-not-found-error.js";

describe("UserNotFoundError", () => {
  it("answers 404 with a stable code and a message for the user", () => {
    const error = new UserNotFoundError();

    expect(error).toBeInstanceOf(EntityNotFoundError);
    expect(error).toMatchObject({ code: "USER_NOT_FOUND", message: "No encontramos el usuario." });
  });
});
