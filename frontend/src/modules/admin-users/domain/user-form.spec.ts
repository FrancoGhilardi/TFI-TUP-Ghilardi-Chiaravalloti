import { describe, expect, it } from "vitest";

import type { AdminUserRow } from "./admin-user";
import { EMPTY_USER_FORM, initialValuesOf, type UserFormValues, userFormSchema } from "./user-form";

const valid = (overrides: Partial<UserFormValues> = {}): UserFormValues => ({
  name: "Marta Gómez",
  email: "marta@libreriamisueno.com.ar",
  role: "SELLER",
  temporaryPassword: "clave-temporal-1",
  passwordConfirmation: "clave-temporal-1",
  isActive: true,
  ...overrides,
});

const issues = (mode: "create" | "edit", values: UserFormValues) => {
  const result = userFormSchema(mode).safeParse(values);
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
};

describe("userFormSchema creating", () => {
  it("accepts a complete user", () => {
    expect(issues("create", valid())).toEqual({});
  });

  it("asks for every required field in an empty form", () => {
    expect(Object.keys(issues("create", EMPTY_USER_FORM)).sort()).toEqual([
      "email",
      "name",
      "passwordConfirmation",
      "role",
      "temporaryPassword",
    ]);
  });

  it("does not take a blank name", () => {
    expect(issues("create", valid({ name: "   " })).name).toBe("Escribí el nombre.");
  });

  it("counts the name in code points, not in UTF-16 units", () => {
    expect(issues("create", valid({ name: "😀".repeat(120) })).name).toBeUndefined();
    expect(issues("create", valid({ name: "😀".repeat(121) })).name).toMatch(/hasta 120/);
  });

  it.each(["marta", "marta@", "@dominio.com", "marta@dominio", "mar ta@dominio.com"])(
    "refuses the email %s",
    (email) => {
      expect(issues("create", valid({ email })).email).toBe(
        "Escribí un email válido, como nombre@dominio.com.",
      );
    },
  );

  it("takes an email with spaces around it", () => {
    expect(issues("create", valid({ email: "  marta@dominio.com " })).email).toBeUndefined();
  });

  it("refuses an email longer than 254 characters", () => {
    const email = `${"a".repeat(250)}@d.co`;

    expect(issues("create", valid({ email })).email).toMatch(/hasta 254/);
  });

  it.each(["", "OWNER", "admin"])("refuses the role %j", (role) => {
    expect(issues("create", valid({ role })).role).toBe("Elegí un rol.");
  });

  it.each(["ADMIN", "SELLER"])("takes the role %s", (role) => {
    expect(issues("create", valid({ role })).role).toBeUndefined();
  });

  it("asks for a password of 8 to 128 characters, kept as typed", () => {
    expect(
      issues("create", valid({ temporaryPassword: "1234567", passwordConfirmation: "1234567" }))
        .temporaryPassword,
    ).toMatch(/entre 8 y 128/);
    expect(
      issues("create", valid({ temporaryPassword: "12345678", passwordConfirmation: "12345678" }))
        .temporaryPassword,
    ).toBeUndefined();
    const long = "a".repeat(129);
    expect(
      issues("create", valid({ temporaryPassword: long, passwordConfirmation: long }))
        .temporaryPassword,
    ).toMatch(/entre 8 y 128/);
    const spaces = "        ";
    expect(
      issues("create", valid({ temporaryPassword: spaces, passwordConfirmation: spaces }))
        .temporaryPassword,
    ).toBeUndefined();
  });

  it("asks for the confirmation and that it matches", () => {
    expect(issues("create", valid({ passwordConfirmation: "" })).passwordConfirmation).toBe(
      "Repetí la contraseña.",
    );
    expect(
      issues("create", valid({ passwordConfirmation: "otra-clave-1" })).passwordConfirmation,
    ).toBe("Las contraseñas no coinciden.");
  });
});

describe("userFormSchema editing", () => {
  it("does not look at the password fields", () => {
    expect(issues("edit", valid({ temporaryPassword: "", passwordConfirmation: "" }))).toEqual({});
  });

  it("still checks name, email and role", () => {
    expect(Object.keys(issues("edit", valid({ name: "", email: "x", role: "" }))).sort()).toEqual([
      "email",
      "name",
      "role",
    ]);
  });
});

describe("initialValuesOf", () => {
  it("opens the form with what the user has, and no password", () => {
    const user: AdminUserRow = {
      id: "u1",
      email: "ana@libreriamisueno.com.ar",
      name: "Ana",
      role: "ADMIN",
      isActive: false,
      mustChangePassword: true,
      lastLoginAt: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-02-01T00:00:00Z"),
      deletedAt: null,
    };

    expect(initialValuesOf(user)).toEqual({
      name: "Ana",
      email: "ana@libreriamisueno.com.ar",
      role: "ADMIN",
      isActive: false,
      temporaryPassword: "",
      passwordConfirmation: "",
    });
  });
});
