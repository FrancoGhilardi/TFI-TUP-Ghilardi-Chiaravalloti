import { describe, expect, it } from "vitest";

import { changePasswordFormSchema } from "./change-password-form";

const valid = {
  currentPassword: "clave-actual",
  newPassword: "clave-nueva-1",
  confirmPassword: "clave-nueva-1",
};

const issues = (values: Partial<typeof valid>) => {
  const result = changePasswordFormSchema.safeParse({ ...valid, ...values });
  return result.success
    ? []
    : result.error.issues.map((issue) => [issue.path.join("."), issue.message]);
};

describe("changePasswordFormSchema", () => {
  it("accepts a new password that is confirmed and different from the current one", () => {
    expect(changePasswordFormSchema.parse(valid)).toEqual(valid);
  });

  it("asks for the current password", () => {
    expect(issues({ currentPassword: "" })).toEqual([
      ["currentPassword", "Escribí tu contraseña actual."],
    ]);
  });

  it("rejects a new password shorter than 8", () => {
    expect(issues({ newPassword: "1234567", confirmPassword: "1234567" })).toEqual([
      ["newPassword", "La contraseña nueva debe tener al menos 8 caracteres."],
    ]);
  });

  it("asks for both new password fields when they are empty", () => {
    expect(issues({ newPassword: "", confirmPassword: "" })).toEqual([
      ["newPassword", "La contraseña nueva debe tener al menos 8 caracteres."],
      ["confirmPassword", "Repetí la contraseña nueva."],
    ]);
  });

  it("accepts a new password of exactly 8 and of exactly 128 characters", () => {
    for (const length of [8, 128]) {
      const password = "a".repeat(length);
      expect(issues({ newPassword: password, confirmPassword: password })).toEqual([]);
    }
  });

  it("rejects a new password longer than 128 characters", () => {
    const password = "a".repeat(129);

    expect(issues({ newPassword: password, confirmPassword: password })).toEqual([
      ["newPassword", "La contraseña nueva no puede tener más de 128 caracteres."],
    ]);
  });

  it("keeps spaces: they count as characters and are not trimmed", () => {
    const password = "        ";

    expect(
      changePasswordFormSchema.parse({
        ...valid,
        newPassword: password,
        confirmPassword: password,
      }),
    ).toMatchObject({ newPassword: password });
  });

  it("asks to repeat the new password when it is empty", () => {
    expect(issues({ confirmPassword: "" })).toEqual([
      ["confirmPassword", "Repetí la contraseña nueva."],
    ]);
  });

  it("rejects a repetition that differs", () => {
    expect(issues({ confirmPassword: "otra-clave-1" })).toEqual([
      ["confirmPassword", "Las contraseñas no coinciden."],
    ]);
  });

  it("rejects a new password equal to the current one", () => {
    expect(
      issues({
        currentPassword: "misma-clave-1",
        newPassword: "misma-clave-1",
        confirmPassword: "misma-clave-1",
      }),
    ).toEqual([["newPassword", "La contraseña nueva tiene que ser distinta de la actual."]]);
  });
});
