import { isCheckViolation, isUniqueViolation } from "./constraint-violation.js";

const pgError = (code: string, constraint: string) =>
  Object.assign(new Error("duplicate key value"), { code, constraint });

describe("isUniqueViolation", () => {
  it("finds the violation of that constraint, also wrapped by the ORM", () => {
    const error = pgError("23505", "uq_users_email_not_deleted");

    expect(isUniqueViolation(error, "uq_users_email_not_deleted")).toBe(true);
    expect(
      isUniqueViolation(new Error("Failed query", { cause: error }), "uq_users_email_not_deleted"),
    ).toBe(true);
  });

  it.each([
    ["another constraint", pgError("23505", "uq_other")],
    ["another error code", pgError("23503", "uq_users_email_not_deleted")],
    ["an error without a code", new Error("boom")],
    ["a value that is not an error", "boom"],
  ])("is false for %s", (_label, error) => {
    expect(isUniqueViolation(error, "uq_users_email_not_deleted")).toBe(false);
  });

  it("finds a check violation named by a trigger, and only that one", () => {
    const error = pgError("23514", "chk_users_last_active_admin");

    expect(isCheckViolation(error, "chk_users_last_active_admin")).toBe(true);
    expect(isCheckViolation(error, "chk_other")).toBe(false);
    expect(isUniqueViolation(error, "chk_users_last_active_admin")).toBe(false);
  });
});
