import { describe, expect, it } from "vitest";

import { forgotPasswordFormSchema } from "./forgot-password-form";

const messages = (email: string) => {
  const result = forgotPasswordFormSchema.safeParse({ email });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("forgotPasswordFormSchema", () => {
  it("accepts an email, dropping surrounding spaces", () => {
    expect(forgotPasswordFormSchema.parse({ email: "  marta@libreria.com " })).toEqual({
      email: "marta@libreria.com",
    });
  });

  it("asks for the email when it is missing or blank", () => {
    expect(messages("")).toEqual(["Escribí tu email."]);
    expect(messages("   ")).toEqual(["Escribí tu email."]);
  });

  it("asks for a valid email", () => {
    expect(messages("marta@")).toEqual(["Escribí un email válido, como nombre@dominio.com."]);
  });
});
