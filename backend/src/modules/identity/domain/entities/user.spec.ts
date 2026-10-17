import { UserRole } from "../user-role.js";
import { Email } from "../value-objects/email.js";
import { TemporaryPassword } from "../value-objects/temporary-password.js";
import { User, type UserProps } from "./user.js";

function user(overrides: Partial<UserProps> = {}): User {
  return User.reconstitute({
    id: "user-1",
    email: Email.create("ana@example.com"),
    name: "Ana",
    passwordHash: "hash",
    role: UserRole.SELLER,
    active: true,
    mustChangePassword: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  });
}

describe("User", () => {
  it("exposes the reconstituted data", () => {
    const temporaryPassword = new TemporaryPassword("temp-hash", new Date("2026-02-01"));
    const passwordChangedAt = new Date("2026-01-15");
    const result = user({ temporaryPassword, passwordChangedAt, mustChangePassword: true });

    expect(result.getId()).toBe("user-1");
    expect(result.email.toString()).toBe("ana@example.com");
    expect(result).toMatchObject({
      name: "Ana",
      passwordHash: "hash",
      role: UserRole.SELLER,
      active: true,
      mustChangePassword: true,
      temporaryPassword,
      passwordChangedAt,
      deletedAt: undefined,
    });
  });

  it("is not affected by later changes to the props it was built from", () => {
    const props: UserProps = {
      id: "user-1",
      email: Email.create("ana@example.com"),
      name: "Ana",
      passwordHash: "hash",
      role: UserRole.ADMIN,
      active: true,
      mustChangePassword: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = User.reconstitute(props);

    props.role = UserRole.SELLER;

    expect(result.role).toBe(UserRole.ADMIN);
  });

  describe("queries", () => {
    const deletedAt = new Date("2026-03-01");

    it.each([
      ["an active admin", { role: UserRole.ADMIN }, true, true, true, false],
      ["an active seller", { role: UserRole.SELLER }, false, true, false, false],
      ["an inactive admin", { role: UserRole.ADMIN, active: false }, true, false, false, false],
      ["a deleted admin", { role: UserRole.ADMIN, deletedAt }, true, false, false, true],
      ["a deleted seller", { deletedAt, active: false }, false, false, false, true],
    ] as const)(
      "answers for %s",
      (_label, overrides, isAdmin, canLogin, isActiveAdmin, isDeleted) => {
        const result = user(overrides);

        expect(result.isAdmin()).toBe(isAdmin);
        expect(result.canLogin()).toBe(canLogin);
        expect(result.isActiveAdmin()).toBe(isActiveAdmin);
        expect(result.isDeleted()).toBe(isDeleted);
      },
    );
  });
});
