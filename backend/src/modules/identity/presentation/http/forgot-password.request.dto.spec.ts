import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ForgotPasswordRequestDto } from "./forgot-password.request.dto.js";

async function check(body: Record<string, unknown>) {
  const dto = plainToInstance(ForgotPasswordRequestDto, body);
  const errors = await validate(dto);
  return {
    dto,
    messages: Object.fromEntries(
      errors.map((error) => [error.property, Object.values(error.constraints ?? {})]),
    ),
  };
}

describe("ForgotPasswordRequestDto", () => {
  it("trims the email", async () => {
    const { dto, messages } = await check({ email: "  ana@example.com " });

    expect(messages).toEqual({});
    expect(dto.email).toBe("ana@example.com");
  });

  it("does not check the format, so a malformed email gets the same answer", async () => {
    await expect(check({ email: "not-an-email" })).resolves.toMatchObject({ messages: {} });
  });

  it.each([
    ["missing", {}],
    ["blank", { email: "   " }],
    ["not a string", { email: 42 }],
  ])("asks for the email when it is %s", async (_label, body) => {
    const { messages } = await check(body);

    expect(messages.email).toContain("Ingresá tu email.");
  });

  it("rejects an email over 254 characters", async () => {
    const { messages } = await check({ email: `${"a".repeat(243)}@example.com` });

    expect(messages.email).toEqual(["Es demasiado largo."]);
  });
});
