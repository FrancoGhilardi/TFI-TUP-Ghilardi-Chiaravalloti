import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { LoginRequestDto } from "./login.request.dto.js";

async function check(body: Record<string, unknown>) {
  const dto = plainToInstance(LoginRequestDto, body);
  const errors = await validate(dto);
  return {
    dto,
    messages: Object.fromEntries(
      errors.map((error) => [error.property, Object.values(error.constraints ?? {})]),
    ),
  };
}

const valid = { email: "ana@example.com", password: "any-password" };

describe("LoginRequestDto", () => {
  it("accepts an email and a password", async () => {
    await expect(check(valid)).resolves.toMatchObject({ messages: {} });
  });

  it("trims the email but keeps the password as typed", async () => {
    const { dto, messages } = await check({ email: "  ana@example.com ", password: "  pass  " });

    expect(messages).toEqual({});
    expect(dto.email).toBe("ana@example.com");
    expect(dto.password).toBe("  pass  ");
  });

  it("does not apply the password policy: a short password is only a wrong one", async () => {
    await expect(check({ ...valid, password: "1" })).resolves.toMatchObject({ messages: {} });
  });

  it("does not check the email format, so a malformed one gets the generic login error", async () => {
    await expect(check({ ...valid, email: "not-an-email" })).resolves.toMatchObject({
      messages: {},
    });
  });

  it.each([
    ["missing", {}],
    ["blank", { email: "   " }],
    ["not a string", { email: 42 }],
  ])("asks for the email when it is %s", async (_label, email) => {
    const { messages } = await check({ password: valid.password, ...email });

    expect(messages.email).toContain("Ingresá tu email.");
  });

  it.each([
    ["missing", {}],
    ["empty", { password: "" }],
    ["not a string", { password: ["a"] }],
  ])("asks for the password when it is %s", async (_label, password) => {
    const { messages } = await check({ email: valid.email, ...password });

    expect(messages.password).toContain("Ingresá tu contraseña.");
  });

  it.each([
    ["email", { ...valid, email: `${"a".repeat(243)}@example.com` }],
    ["password", { ...valid, password: "a".repeat(1025) }],
  ])("rejects an oversized %s", async (field, body) => {
    const { messages } = await check(body);

    expect(messages[field]).toEqual(["Es demasiado largo."]);
  });

  it.each([
    ["email", { ...valid, email: `${"a".repeat(242)}@example.com` }],
    ["password", { ...valid, password: "a".repeat(1024) }],
  ])("accepts a %s at the size limit", async (_field, body) => {
    await expect(check(body)).resolves.toMatchObject({ messages: {} });
  });
});
