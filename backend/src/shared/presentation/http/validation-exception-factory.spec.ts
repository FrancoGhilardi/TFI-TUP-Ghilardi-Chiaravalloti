import "reflect-metadata";
import { IsEmail, IsInt, IsString, Min, ValidateNested, validate } from "class-validator";
import { plainToInstance, Type } from "class-transformer";

import { InvalidValueError } from "../../domain/errors/index.js";
import { RequestValidationError } from "./request-validation-error.js";
import { validationExceptionFactory } from "./validation-exception-factory.js";

class ItemDto {
  @IsString()
  name!: string;
}

class OrderDto {
  @IsEmail()
  email!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items!: ItemDto[];
}

async function build(plain: object): Promise<RequestValidationError> {
  const errors = await validate(plainToInstance(OrderDto, plain), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return validationExceptionFactory(errors);
}

describe("validationExceptionFactory", () => {
  it("builds an invalid value error with a stable code", async () => {
    const error = await build({ email: "x", quantity: 1, items: [] });

    expect(error).toBeInstanceOf(RequestValidationError);
    expect(error).toBeInstanceOf(InvalidValueError);
    expect(error.code).toBe("VALIDATION_FAILED");
  });

  it("reports a single failing field", async () => {
    const error = await build({ email: "nope", quantity: 1, items: [] });

    expect(error.details).toEqual([{ field: "email", messages: ["email must be an email"] }]);
  });

  it("groups every message of a field into one item", async () => {
    const error = await build({ email: "a@b.com", quantity: 0.5, items: [] });

    expect(error.details).toHaveLength(1);
    expect(error.details[0].field).toBe("quantity");
    expect(error.details[0].messages).toHaveLength(2);
  });

  it("reports nested fields with a dotted path", async () => {
    const error = await build({
      email: "a@b.com",
      quantity: 1,
      items: [{ name: "ok" }, { name: 5 }],
    });

    expect(error.details).toEqual([{ field: "items.1.name", messages: ["name must be a string"] }]);
  });

  it("reports properties rejected by forbidNonWhitelisted", async () => {
    const error = await build({ email: "a@b.com", quantity: 1, items: [], extra: true });

    expect(error.details).toEqual([
      { field: "extra", messages: ["property extra should not exist"] },
    ]);
  });
});
