import { InvalidUserNameError } from "../errors/invalid-user-name-error.js";
import { UserName } from "./user-name.js";

describe("UserName", () => {
  it("keeps a valid name", () => {
    expect(UserName.create("Ana Pérez").toString()).toBe("Ana Pérez");
  });

  it("trims surrounding spaces", () => {
    expect(UserName.create("  Ana Pérez \n").toString()).toBe("Ana Pérez");
  });

  it.each([
    ["an empty name", ""],
    ["a name with only spaces", "   \t "],
    ["a name one character too long", "a".repeat(121)],
  ])("rejects %s", (_label, value) => {
    expect(() => UserName.create(value)).toThrow(InvalidUserNameError);
  });

  it("accepts the maximum length", () => {
    expect(UserName.create("a".repeat(120)).toString()).toHaveLength(120);
  });

  it("measures the length after trimming", () => {
    expect(UserName.create(`  ${"a".repeat(120)}  `).toString()).toHaveLength(120);
  });

  it("counts code points, like the database column", () => {
    expect(() => UserName.create("🙂".repeat(120))).not.toThrow();
    expect(() => UserName.create("🙂".repeat(121))).toThrow(InvalidUserNameError);
  });

  it("rebuilds a stored name as is, without validating it again", () => {
    expect(UserName.fromPersisted(" stored ").toString()).toBe(" stored ");
  });

  it("compares by value", () => {
    expect(UserName.create("Ana").equals(UserName.create(" Ana "))).toBe(true);
    expect(UserName.create("Ana").equals(UserName.create("ana"))).toBe(false);
  });

  it("rejects with a stable code and a user-facing message", () => {
    expect(() => UserName.create("")).toThrow(
      expect.objectContaining({
        code: "INVALID_USER_NAME",
        message: "El nombre no puede estar vacío ni tener más de 120 caracteres.",
      }),
    );
  });
});
