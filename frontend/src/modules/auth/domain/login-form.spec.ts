import { describe, expect, it } from "vitest";

import { loginFormSchema } from "./login-form";

const messages = (values: { email: string; password: string }) => {
  const result = loginFormSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("loginFormSchema", () => {
  it("accepts an email and a password, trimming the email only", () => {
    expect(loginFormSchema.parse({ email: "  marta@libreria.com  ", password: " clave " })).toEqual(
      {
        email: "marta@libreria.com",
        password: " clave ",
      },
    );
  });

  it("asks for the email when it is missing or blank", () => {
    expect(messages({ email: "", password: "x" })).toEqual(["Escribí tu email."]);
    expect(messages({ email: "   ", password: "x" })).toEqual(["Escribí tu email."]);
  });

  it("asks for a valid email", () => {
    expect(messages({ email: "marta@", password: "x" })).toEqual([
      "Escribí un email válido, como nombre@dominio.com.",
    ]);
  });

  it("asks for the password", () => {
    expect(messages({ email: "marta@libreria.com", password: "" })).toEqual([
      "Escribí tu contraseña.",
    ]);
  });
});
