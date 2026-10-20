import { User, type UserProps } from "../entities/user.js";
import { LastActiveAdminError } from "../errors/last-active-admin-error.js";
import { SelfAdministrationError } from "../errors/self-administration-error.js";
import { UserRole } from "../user-role.js";
import { Email } from "../value-objects/email.js";
import { UserName } from "../value-objects/user-name.js";
import { UserAdministrationPolicy } from "./user-administration.policy.js";

const ACTOR = "admin-1";
const TARGET = "user-2";

function user(id: string, overrides: Partial<UserProps> = {}): User {
  return User.reconstitute({
    id,
    email: Email.create(`${id}@example.com`),
    name: UserName.create(id),
    passwordHash: "hash",
    role: UserRole.ADMIN,
    active: true,
    mustChangePassword: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  });
}

const activeAdmin = (id = TARGET) => user(id);
const seller = (id = TARGET) => user(id, { role: UserRole.SELLER });
const inactiveAdmin = () => user(TARGET, { active: false });
const deletedAdmin = () => user(TARGET, { active: false, deletedAt: new Date("2026-05-01") });

type Action = (policy: UserAdministrationPolicy, target: User, others: number) => void;

const ACTIONS: [string, Action][] = [
  ["change the role to SELLER", (p, t, o) => p.assertCanChangeRole(ACTOR, t, UserRole.SELLER, o)],
  ["deactivate", (p, t, o) => p.assertCanDeactivate(ACTOR, t, o)],
  ["delete", (p, t, o) => p.assertCanDelete(ACTOR, t, o)],
];

describe("UserAdministrationPolicy", () => {
  const policy = new UserAdministrationPolicy();

  describe("an admin acting on their own account", () => {
    it.each(ACTIONS)("cannot %s", (_label, action) => {
      expect(() => action(policy, activeAdmin(ACTOR), 3)).toThrow(SelfAdministrationError);
    });

    it("cannot change their own role even when other admins exist", () => {
      expect(() =>
        policy.assertCanChangeRole(ACTOR, activeAdmin(ACTOR), UserRole.SELLER, 5),
      ).toThrow(SelfAdministrationError);
    });

    it("is reported as acting on themselves before the last-admin rule applies", () => {
      expect(() => policy.assertCanDelete(ACTOR, activeAdmin(ACTOR), 0)).toThrow(
        SelfAdministrationError,
      );
    });

    it("can still make a change that leaves their account as it was", () => {
      expect(() =>
        policy.assertCanChangeRole(ACTOR, activeAdmin(ACTOR), UserRole.ADMIN, 0),
      ).not.toThrow();
    });
  });

  describe("the last active admin", () => {
    it.each(ACTIONS)("cannot be made to %s", (_label, action) => {
      expect(() => action(policy, activeAdmin(), 0)).toThrow(LastActiveAdminError);
    });

    it.each(ACTIONS)("can %s while another active admin remains", (_label, action) => {
      expect(() => action(policy, activeAdmin(), 1)).not.toThrow();
    });
  });

  describe("users whose change cannot leave the system without an admin", () => {
    it.each(ACTIONS)("a seller can %s with no admins left to count", (_label, action) => {
      expect(() => action(policy, seller(), 0)).not.toThrow();
    });

    it("an inactive admin can change role with no other active admins", () => {
      expect(() =>
        policy.assertCanChangeRole(ACTOR, inactiveAdmin(), UserRole.SELLER, 0),
      ).not.toThrow();
    });

    it("an inactive admin can be deleted with no other active admins", () => {
      expect(() => policy.assertCanDelete(ACTOR, inactiveAdmin(), 0)).not.toThrow();
    });

    it("anyone can be promoted to ADMIN", () => {
      expect(() => policy.assertCanChangeRole(ACTOR, seller(), UserRole.ADMIN, 0)).not.toThrow();
    });
  });

  describe("changes that leave the target as it was", () => {
    it("keeping the same role is allowed", () => {
      expect(() =>
        policy.assertCanChangeRole(ACTOR, activeAdmin(), UserRole.ADMIN, 0),
      ).not.toThrow();
    });

    it("deactivating an inactive user is allowed, even on their own account", () => {
      expect(() =>
        policy.assertCanDeactivate(TARGET, user(TARGET, { active: false }), 0),
      ).not.toThrow();
    });

    it("deleting a deleted user is allowed", () => {
      expect(() => policy.assertCanDelete(ACTOR, deletedAdmin(), 0)).not.toThrow();
    });
  });
});
