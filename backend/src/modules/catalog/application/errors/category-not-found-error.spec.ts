import { EntityNotFoundError } from "../../../../shared/domain/errors/index.js";
import { CategoryNotFoundError } from "./category-not-found-error.js";

describe("CategoryNotFoundError", () => {
  it("answers 404 with a stable code and a message for the user", () => {
    const error = new CategoryNotFoundError();

    expect(error).toBeInstanceOf(EntityNotFoundError);
    expect(error).toMatchObject({
      code: "CATEGORY_NOT_FOUND",
      message: "No encontramos la categoría.",
    });
  });
});
