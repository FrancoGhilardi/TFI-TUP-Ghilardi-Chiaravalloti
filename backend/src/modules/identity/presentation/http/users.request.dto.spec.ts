// Loaded by Nest in the app; @Type needs it to convert the query string values.
import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RecordStatusFilter, SortDirection } from "../../../../shared/application/pagination.js";
import { UserRole } from "../../domain/user-role.js";
import { CreateUserRequestDto } from "./create-user.request.dto.js";
import { ListUsersRequestDto } from "./list-users.request.dto.js";
import { UpdateUserRequestDto } from "./update-user.request.dto.js";

async function check<T extends object>(type: new () => T, body: Record<string, unknown>) {
  const dto = plainToInstance(type, body);
  const errors = await validate(dto);
  return {
    dto,
    messages: Object.fromEntries(
      errors.map((error) => [error.property, Object.values(error.constraints ?? {})]),
    ),
  };
}

describe("ListUsersRequestDto", () => {
  it("defaults to the first page of 20, sorted ascending, with no filters", async () => {
    const { dto, messages } = await check(ListUsersRequestDto, {});

    expect(messages).toEqual({});
    expect(dto).toMatchObject({ page: 1, limit: 20, sortDir: SortDirection.ASC });
    expect(dto.status).toBeUndefined();
    expect(dto.role).toBeUndefined();
  });

  it("reads the query string values, trimming the search", async () => {
    const { dto, messages } = await check(ListUsersRequestDto, {
      q: "  ana ",
      role: "ADMIN",
      status: "DELETED",
      sortDir: "DESC",
      page: "3",
      limit: "100",
    });

    expect(messages).toEqual({});
    expect(dto).toMatchObject({
      q: "ana",
      role: UserRole.ADMIN,
      status: RecordStatusFilter.DELETED,
      sortDir: SortDirection.DESC,
      page: 3,
      limit: 100,
    });
  });

  it.each([
    ["page", "0"],
    ["page", "1.5"],
    ["page", "first"],
    ["limit", "0"],
    ["limit", "101"],
    ["role", "OWNER"],
    ["status", "GONE"],
    ["sortDir", "UP"],
  ])("rejects %s=%s", async (field, value) => {
    const { messages } = await check(ListUsersRequestDto, { [field]: value });

    expect(messages[field]).toBeDefined();
  });

  it("rejects a search over 100 characters", async () => {
    const { messages } = await check(ListUsersRequestDto, { q: "a".repeat(101) });

    expect(messages.q).toEqual(["Es demasiado largo."]);
  });
});

describe("CreateUserRequestDto", () => {
  const valid = {
    email: " nuevo@example.com ",
    name: " Nuevo ",
    role: "SELLER",
    temporaryPassword: " temporary-123 ",
  };

  it("trims the email and name but keeps the password as typed", async () => {
    const { dto, messages } = await check(CreateUserRequestDto, valid);

    expect(messages).toEqual({});
    expect(dto).toMatchObject({
      email: "nuevo@example.com",
      name: "Nuevo",
      temporaryPassword: " temporary-123 ",
    });
  });

  it.each([
    ["email", "   ", "Ingresá el email."],
    ["name", "   ", "Ingresá el nombre."],
    ["role", "OWNER", "Elegí un rol válido."],
    ["temporaryPassword", "", "Ingresá la contraseña."],
  ])("asks again for %s when it is %o", async (field, value, message) => {
    const { messages } = await check(CreateUserRequestDto, { ...valid, [field]: value });

    expect(messages[field]).toContain(message);
  });

  it("leaves the email format and the password policy to the domain", async () => {
    await expect(
      check(CreateUserRequestDto, { ...valid, email: "ana@corp.x", temporaryPassword: "1" }),
    ).resolves.toMatchObject({ messages: {} });
  });
});

describe("UpdateUserRequestDto", () => {
  it("accepts an empty body and any of the fields", async () => {
    await expect(check(UpdateUserRequestDto, {})).resolves.toMatchObject({ messages: {} });
    const { dto, messages } = await check(UpdateUserRequestDto, {
      name: " Ana ",
      isActive: false,
    });

    expect(messages).toEqual({});
    expect(dto).toMatchObject({ name: "Ana", isActive: false });
  });

  it.each([
    ["email", null],
    ["name", null],
    ["role", null],
    ["isActive", null],
    ["isActive", "false"],
    ["email", "   "],
  ])("rejects %s=%o instead of skipping it", async (field, value) => {
    const { messages } = await check(UpdateUserRequestDto, { [field]: value });

    expect(messages[field]).toBeDefined();
  });
});
