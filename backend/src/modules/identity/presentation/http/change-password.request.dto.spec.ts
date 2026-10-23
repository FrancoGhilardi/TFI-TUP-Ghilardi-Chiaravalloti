import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ChangePasswordRequestDto } from "./change-password.request.dto.js";

async function check(body: Record<string, unknown>) {
  const dto = plainToInstance(ChangePasswordRequestDto, body);
  const errors = await validate(dto);
  return {
    dto,
    messages: Object.fromEntries(
      errors.map((error) => [error.property, Object.values(error.constraints ?? {})]),
    ),
  };
}

const valid = { currentPassword: "current-password", newPassword: "new-password" };

describe("ChangePasswordRequestDto", () => {
  it("accepts both passwords and keeps them as typed", async () => {
    const { dto, messages } = await check({ currentPassword: "  old  ", newPassword: " new " });

    expect(messages).toEqual({});
    expect(dto.currentPassword).toBe("  old  ");
    expect(dto.newPassword).toBe(" new ");
  });

  it("leaves the password policy to the use case", async () => {
    await expect(check({ ...valid, newPassword: "1" })).resolves.toMatchObject({ messages: {} });
  });

  it.each([
    ["missing", {}],
    ["empty", { currentPassword: "" }],
    ["not a string", { currentPassword: 42 }],
  ])("asks for the current password when it is %s", async (_label, current) => {
    const { messages } = await check({ newPassword: valid.newPassword, ...current });

    expect(messages.currentPassword).toContain("Ingresá tu contraseña actual.");
  });

  it.each([
    ["missing", {}],
    ["empty", { newPassword: "" }],
    ["not a string", { newPassword: ["a"] }],
  ])("asks for the new password when it is %s", async (_label, next) => {
    const { messages } = await check({ currentPassword: valid.currentPassword, ...next });

    expect(messages.newPassword).toContain("Ingresá la nueva contraseña.");
  });

  it.each(["currentPassword", "newPassword"])(
    "rejects a %s over 1024 characters",
    async (field) => {
      await expect(check({ ...valid, [field]: "a".repeat(1024) })).resolves.toMatchObject({
        messages: {},
      });
      const { messages } = await check({ ...valid, [field]: "a".repeat(1025) });

      expect(messages[field]).toEqual(["Es demasiado largo."]);
    },
  );
});
