import { DeletedUserError } from "../errors/deleted-user-error.js";
import { TemporaryPasswordUnavailableError } from "../errors/temporary-password-unavailable-error.js";
import { UserNotDeletedError } from "../errors/user-not-deleted-error.js";
import { UserRole } from "../user-role.js";
import { Email } from "../value-objects/email.js";
import { TemporaryPassword } from "../value-objects/temporary-password.js";
import { UserName } from "../value-objects/user-name.js";
import { User, type UserProps } from "./user.js";

const CREATED_AT = new Date("2026-01-01T00:00:00.000Z");
const NOW = new Date("2026-10-20T12:00:00.000Z");
const ACTOR = "admin-1";

function user(overrides: Partial<UserProps> = {}): User {
  return User.reconstitute({
    id: "user-1",
    email: Email.create("ana@example.com"),
    name: UserName.create("Ana"),
    passwordHash: "hash",
    role: UserRole.SELLER,
    active: true,
    mustChangePassword: false,
    createdBy: "creator-1",
    updatedBy: "creator-1",
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  });
}

const audit = (target: User) => ({ updatedBy: target.updatedBy, updatedAt: target.updatedAt });

describe("User", () => {
  describe("reconstitute", () => {
    it("exposes the reconstituted data", () => {
      const temporaryPassword = new TemporaryPassword("temp-hash", new Date("2026-02-01"));
      const passwordChangedAt = new Date("2026-01-15");
      const result = user({ temporaryPassword, passwordChangedAt, mustChangePassword: true });

      expect(result.getId()).toBe("user-1");
      expect(result.email.toString()).toBe("ana@example.com");
      expect(result.name.toString()).toBe("Ana");
      expect(result).toMatchObject({
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
        name: UserName.create("Ana"),
        passwordHash: "hash",
        role: UserRole.ADMIN,
        active: true,
        mustChangePassword: false,
        createdAt: CREATED_AT,
        updatedAt: CREATED_AT,
      };
      const result = User.reconstitute(props);

      props.role = UserRole.SELLER;

      expect(result.role).toBe(UserRole.ADMIN);
    });
  });

  describe("create", () => {
    const created = () =>
      User.create({
        id: "new-1",
        email: Email.create("Nuevo@Example.com"),
        name: UserName.create("  Nuevo Usuario "),
        passwordHash: "temporary-hash",
        role: UserRole.SELLER,
        createdBy: ACTOR,
        now: NOW,
      });

    it("starts active and must change the password it was given", () => {
      expect(created()).toMatchObject({
        passwordHash: "temporary-hash",
        role: UserRole.SELLER,
        active: true,
        mustChangePassword: true,
        temporaryPassword: undefined,
        deletedAt: undefined,
      });
    });

    it("keeps the email in lowercase and the name trimmed", () => {
      expect(created().email.toString()).toBe("nuevo@example.com");
      expect(created().name.toString()).toBe("Nuevo Usuario");
    });

    it("records who created it and when", () => {
      expect(created()).toMatchObject({
        createdBy: ACTOR,
        updatedBy: ACTOR,
        createdAt: NOW,
        updatedAt: NOW,
      });
      expect(created().getId()).toBe("new-1");
    });

    it("can be created without an author, as the first admin is", () => {
      const first = User.create({
        id: "first-admin",
        email: Email.create("admin@example.com"),
        name: UserName.create("Admin"),
        passwordHash: "hash",
        role: UserRole.ADMIN,
        now: NOW,
      });

      expect(first).toMatchObject({ createdBy: undefined, updatedBy: undefined });
      expect(first.isActiveAdmin()).toBe(true);
    });
  });

  describe("changes", () => {
    it.each<[string, (target: User) => void, (target: User) => unknown, unknown]>([
      [
        "rename",
        (u) => u.rename(UserName.create("Ana Pérez"), ACTOR, NOW),
        (u) => u.name.toString(),
        "Ana Pérez",
      ],
      [
        "changeEmail",
        (u) => u.changeEmail(Email.create("ANA.P@example.com"), ACTOR, NOW),
        (u) => u.email.toString(),
        "ana.p@example.com",
      ],
      [
        "changeRole",
        (u) => u.changeRole(UserRole.ADMIN, ACTOR, NOW),
        (u) => u.role,
        UserRole.ADMIN,
      ],
      ["deactivate", (u) => u.deactivate(ACTOR, NOW), (u) => u.active, false],
    ])("%s applies the change and records the audit", (_label, change, read, expected) => {
      const target = user();

      change(target);

      expect(read(target)).toBe(expected);
      expect(audit(target)).toEqual({ updatedBy: ACTOR, updatedAt: NOW });
    });

    it("activate reactivates an inactive user and records the audit", () => {
      const target = user({ active: false });

      target.activate(ACTOR, NOW);

      expect(target.active).toBe(true);
      expect(audit(target)).toEqual({ updatedBy: ACTOR, updatedAt: NOW });
    });

    it("deactivating stops the user from logging in", () => {
      const target = user();

      target.deactivate(ACTOR, NOW);

      expect(target.canLogin()).toBe(false);
    });
  });

  describe("changes that leave everything as it was", () => {
    it.each<[string, (target: User) => void]>([
      ["rename to the same name", (u) => u.rename(UserName.create(" Ana "), ACTOR, NOW)],
      [
        "changeEmail to the same email",
        (u) => u.changeEmail(Email.create("ANA@example.com"), ACTOR, NOW),
      ],
      ["changeRole to the same role", (u) => u.changeRole(UserRole.SELLER, ACTOR, NOW)],
      ["activate an active user", (u) => u.activate(ACTOR, NOW)],
    ])("%s does not fail nor touch the audit", (_label, change) => {
      const target = user();

      expect(() => change(target)).not.toThrow();
      expect(audit(target)).toEqual({ updatedBy: "creator-1", updatedAt: CREATED_AT });
    });

    it("deactivate an inactive user does not fail nor touch the audit", () => {
      const target = user({ active: false });

      target.deactivate(ACTOR, NOW);

      expect(audit(target)).toEqual({ updatedBy: "creator-1", updatedAt: CREATED_AT });
    });
  });

  describe("a deleted user", () => {
    const deleted = () =>
      user({ deletedAt: new Date("2026-05-01"), deletedBy: ACTOR, active: false });

    it.each<[string, (target: User) => void]>([
      ["rename", (u) => u.rename(UserName.create("Otra"), ACTOR, NOW)],
      ["changeEmail", (u) => u.changeEmail(Email.create("otra@example.com"), ACTOR, NOW)],
      ["changeRole", (u) => u.changeRole(UserRole.ADMIN, ACTOR, NOW)],
      ["activate", (u) => u.activate(ACTOR, NOW)],
      ["deactivate", (u) => u.deactivate(ACTOR, NOW)],
    ])("cannot be changed with %s", (_label, change) => {
      const target = deleted();

      expect(() => change(target)).toThrow(DeletedUserError);
      expect(audit(target)).toEqual({ updatedBy: "creator-1", updatedAt: CREATED_AT });
    });

    it("is rejected even when the change would leave everything as it was", () => {
      expect(() => deleted().rename(UserName.create("Ana"), ACTOR, NOW)).toThrow(DeletedUserError);
    });
  });

  describe("passwords", () => {
    const VALID_UNTIL = new Date("2026-10-20T12:30:00.000Z");
    const forgotten = () => new TemporaryPassword("forgot-hash", VALID_UNTIL);

    describe("assigned by an admin", () => {
      it("replaces the password, forces a change and drops the forgot-flow password", () => {
        const target = user({ temporaryPassword: forgotten() });

        target.assignTemporaryPassword("admin-hash", ACTOR, NOW);

        expect(target).toMatchObject({
          passwordHash: "admin-hash",
          mustChangePassword: true,
          temporaryPassword: undefined,
          passwordChangedAt: NOW,
        });
        expect(audit(target)).toEqual({ updatedBy: ACTOR, updatedAt: NOW });
      });
    });

    describe("issued by the forgot flow", () => {
      it("lives alongside the current password, which keeps working", () => {
        const target = user();

        target.issueTemporaryPassword(forgotten(), NOW);

        expect(target).toMatchObject({
          passwordHash: "hash",
          mustChangePassword: false,
          temporaryPassword: forgotten(),
        });
        expect(target.passwordChangedAt).toBeUndefined();
      });

      it("records the user as the author, since they asked for it", () => {
        const target = user();

        target.issueTemporaryPassword(forgotten(), NOW);

        expect(audit(target)).toEqual({ updatedBy: "user-1", updatedAt: NOW });
      });
    });

    describe("hasUsableTemporaryPassword", () => {
      it("is true while the temporary password is valid", () => {
        expect(user({ temporaryPassword: forgotten() }).hasUsableTemporaryPassword(NOW)).toBe(true);
      });

      it("is false once it expired", () => {
        expect(
          user({ temporaryPassword: forgotten() }).hasUsableTemporaryPassword(VALID_UNTIL),
        ).toBe(false);
      });

      it("is false without a temporary password", () => {
        expect(user().hasUsableTemporaryPassword(NOW)).toBe(false);
      });
    });

    describe("consumeTemporaryPassword", () => {
      it("makes it the password, forces a change and removes it, as it is single use", () => {
        const target = user({ temporaryPassword: forgotten() });

        target.consumeTemporaryPassword(NOW);

        expect(target).toMatchObject({
          passwordHash: "forgot-hash",
          mustChangePassword: true,
          temporaryPassword: undefined,
          passwordChangedAt: NOW,
          updatedAt: NOW,
          updatedBy: "user-1",
        });
        expect(target.hasUsableTemporaryPassword(NOW)).toBe(false);
      });

      it("rejects an expired temporary password and leaves the user as it was", () => {
        const target = user({ temporaryPassword: forgotten() });

        expect(() => target.consumeTemporaryPassword(VALID_UNTIL)).toThrow(
          TemporaryPasswordUnavailableError,
        );
        expect(target).toMatchObject({ passwordHash: "hash", temporaryPassword: forgotten() });
      });

      it("rejects when there is no temporary password", () => {
        expect(() => user().consumeTemporaryPassword(NOW)).toThrow(
          TemporaryPasswordUnavailableError,
        );
      });
    });

    describe("discardTemporaryPassword", () => {
      it("removes the temporary password and keeps the current one", () => {
        const target = user({ temporaryPassword: forgotten() });

        target.discardTemporaryPassword(NOW);

        expect(target).toMatchObject({ passwordHash: "hash", temporaryPassword: undefined });
        expect(target.updatedAt).toBe(NOW);
      });

      it("does nothing without a temporary password", () => {
        const target = user();

        target.discardTemporaryPassword(NOW);

        expect(audit(target)).toEqual({ updatedBy: "creator-1", updatedAt: CREATED_AT });
      });
    });

    describe("changePassword", () => {
      it("replaces the password, ends the pending change and drops temporary passwords", () => {
        const target = user({ mustChangePassword: true, temporaryPassword: forgotten() });

        target.changePassword("own-hash", NOW);

        expect(target).toMatchObject({
          passwordHash: "own-hash",
          mustChangePassword: false,
          temporaryPassword: undefined,
          passwordChangedAt: NOW,
        });
        expect(audit(target)).toEqual({ updatedBy: "user-1", updatedAt: NOW });
      });
    });
  });

  describe("recordLogin", () => {
    it("records the login time without touching the audit", () => {
      const target = user();

      target.recordLogin(NOW);

      expect(target.lastLoginAt).toBe(NOW);
      expect(audit(target)).toEqual({ updatedBy: "creator-1", updatedAt: CREATED_AT });
    });
  });

  describe("softDelete", () => {
    it("records who deleted the user and when, and deactivates it", () => {
      const target = user();

      target.softDelete(ACTOR, NOW);

      expect(target).toMatchObject({ deletedAt: NOW, deletedBy: ACTOR, active: false });
      expect(audit(target)).toEqual({ updatedBy: ACTOR, updatedAt: NOW });
      expect(target.isDeleted()).toBe(true);
      expect(target.canLogin()).toBe(false);
    });

    it("does nothing on a user that is already deleted", () => {
      const firstDeletion = new Date("2026-05-01");
      const target = user({ deletedAt: firstDeletion, deletedBy: "someone-else", active: false });

      target.softDelete(ACTOR, NOW);

      expect(target).toMatchObject({ deletedAt: firstDeletion, deletedBy: "someone-else" });
      expect(audit(target)).toEqual({ updatedBy: "creator-1", updatedAt: CREATED_AT });
    });
  });

  describe("restore", () => {
    it("clears the deletion, reactivates the user and records who did it", () => {
      const target = user({
        deletedAt: new Date("2026-05-01"),
        deletedBy: "someone-else",
        active: false,
      });

      target.restore(ACTOR, NOW);

      expect(target).toMatchObject({ deletedAt: undefined, deletedBy: undefined, active: true });
      expect(audit(target)).toEqual({ updatedBy: ACTOR, updatedAt: NOW });
      expect(target.canLogin()).toBe(true);
    });

    it("rejects a user that is not deleted", () => {
      const target = user();

      expect(() => target.restore(ACTOR, NOW)).toThrow(UserNotDeletedError);
      expect(audit(target)).toEqual({ updatedBy: "creator-1", updatedAt: CREATED_AT });
    });

    it("makes the user editable again", () => {
      const target = user({ deletedAt: new Date("2026-05-01"), active: false });

      target.restore(ACTOR, NOW);

      expect(() => target.rename(UserName.create("Otra"), ACTOR, NOW)).not.toThrow();
    });
  });

  describe("a deleted user and its passwords", () => {
    const deleted = () =>
      user({
        deletedAt: new Date("2026-05-01"),
        active: false,
        temporaryPassword: new TemporaryPassword("forgot-hash", new Date("2026-10-20T12:30:00Z")),
      });

    it.each<[string, (target: User) => void]>([
      ["assignTemporaryPassword", (u) => u.assignTemporaryPassword("hash-2", ACTOR, NOW)],
      [
        "issueTemporaryPassword",
        (u) => u.issueTemporaryPassword(new TemporaryPassword("t", new Date("2027-01-01")), NOW),
      ],
      ["consumeTemporaryPassword", (u) => u.consumeTemporaryPassword(NOW)],
      ["discardTemporaryPassword", (u) => u.discardTemporaryPassword(NOW)],
      ["changePassword", (u) => u.changePassword("hash-2", NOW)],
      ["recordLogin", (u) => u.recordLogin(NOW)],
    ])("cannot be changed with %s", (_label, change) => {
      expect(() => change(deleted())).toThrow(DeletedUserError);
    });
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
