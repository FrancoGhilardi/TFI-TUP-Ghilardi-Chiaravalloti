import { describe, expect, it } from "vitest";

import type { UserFormValues } from "./user-form";
import { hasChanges, toCreateRequest, toUpdateRequest } from "./user-request";

const initial: UserFormValues = {
  name: "Marta Gómez",
  email: "marta@libreriamisueno.com.ar",
  role: "SELLER",
  temporaryPassword: "",
  passwordConfirmation: "",
  isActive: true,
};

describe("toCreateRequest", () => {
  it("sends what the API asks for, trimmed, with the password as typed and no confirmation", () => {
    expect(
      toCreateRequest({
        name: "  Ana  ",
        email: " ana@dominio.com ",
        role: "ADMIN",
        temporaryPassword: " clave con espacios ",
        passwordConfirmation: " clave con espacios ",
        isActive: true,
      }),
    ).toEqual({
      name: "Ana",
      email: "ana@dominio.com",
      role: "ADMIN",
      temporaryPassword: " clave con espacios ",
    });
  });
});

describe("toUpdateRequest", () => {
  it("is empty when nothing changed", () => {
    expect(toUpdateRequest(initial, initial)).toEqual({});
    expect(hasChanges(initial, initial)).toBe(false);
  });

  it("sends only what changed", () => {
    expect(toUpdateRequest({ ...initial, name: "Marta G." }, initial)).toEqual({
      name: "Marta G.",
    });
    expect(toUpdateRequest({ ...initial, role: "ADMIN" }, initial)).toEqual({ role: "ADMIN" });
    expect(toUpdateRequest({ ...initial, isActive: false }, initial)).toEqual({ isActive: false });
  });

  it("sends several changes together", () => {
    expect(
      toUpdateRequest(
        { ...initial, name: "Otra", email: "otra@dominio.com", isActive: false },
        initial,
      ),
    ).toEqual({ name: "Otra", email: "otra@dominio.com", isActive: false });
  });

  it("does not count spaces around the name as a change", () => {
    expect(hasChanges({ ...initial, name: "  Marta Gómez " }, initial)).toBe(false);
  });

  it("does not count a change of case in the email, which the API stores in lowercase", () => {
    expect(hasChanges({ ...initial, email: " MARTA@libreriamisueno.com.ar" }, initial)).toBe(false);
  });

  it("counts a different email even when only the domain changes", () => {
    expect(toUpdateRequest({ ...initial, email: "marta@otro.com" }, initial)).toEqual({
      email: "marta@otro.com",
    });
  });

  it("ignores the password fields", () => {
    expect(hasChanges({ ...initial, temporaryPassword: "algo-nuevo-1" }, initial)).toBe(false);
  });
});
