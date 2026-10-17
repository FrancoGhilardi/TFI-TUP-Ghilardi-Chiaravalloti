import { InvalidEmailError } from "../errors/invalid-email-error.js";
import { Email } from "./email.js";

describe("Email", () => {
  it("keeps a valid address", () => {
    expect(Email.create("ana@example.com").toString()).toBe("ana@example.com");
  });

  it("stores the address in lowercase", () => {
    expect(Email.create("Ana.Perez@Example.COM").toString()).toBe("ana.perez@example.com");
  });

  it.each(["", "ana", "ana@", "@example.com", "ana@example", "ana perez@example.com", "a@b@c.com"])(
    "rejects %o",
    (value) => {
      expect(() => Email.create(value)).toThrow(InvalidEmailError);
    },
  );

  it("rebuilds a stored address without validating it again", () => {
    expect(Email.fromPersisted("legacy value@example.com").toString()).toBe(
      "legacy value@example.com",
    );
  });

  it("lowercases a stored address", () => {
    expect(Email.fromPersisted("Ana@Example.com").toString()).toBe("ana@example.com");
  });

  it("rejects with a stable code and a user-facing message", () => {
    expect(() => Email.create("nope")).toThrow(
      expect.objectContaining({
        code: "INVALID_EMAIL",
        message: "El email no tiene un formato válido.",
      }),
    );
  });
});
