import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateProductRequestDto } from "./update-product.request.dto.js";

const ID = "4f9c1f43-6f4b-4d5c-9a3e-0000000000a1";

async function messagesFor(body: Record<string, unknown>) {
  const errors = await validate(plainToInstance(UpdateProductRequestDto, body));
  return Object.fromEntries(
    errors.map((error) => [error.property, Object.values(error.constraints ?? {})]),
  );
}

describe("UpdateProductRequestDto", () => {
  it("takes an empty body, changing nothing", async () => {
    await expect(messagesFor({})).resolves.toEqual({});
  });

  it("takes every field, a blank description and no related products", async () => {
    await expect(
      messagesFor({
        title: "Cuaderno",
        description: "",
        price: "1500.50",
        isOnSale: true,
        salePrice: "1000",
        saleEndsAt: "2099-01-01T00:00:00.000Z",
        stock: 2,
        isFeatured: false,
        isNew: true,
        newUntil: "2099-01-01T00:00:00.000Z",
        sortOrder: 1,
        isActive: false,
        categoryIds: [ID],
        primaryCategoryId: ID,
        relatedProductIds: [],
      }),
    ).resolves.toEqual({});
  });

  it.each([
    "title",
    "description",
    "price",
    "isOnSale",
    "stock",
    "isFeatured",
    "isNew",
    "sortOrder",
    "isActive",
    "relatedProductIds",
  ])("refuses a null %s", async (field) => {
    const messages = await messagesFor({ [field]: null });

    expect(Object.keys(messages)).toEqual([field]);
  });

  it("asks for the sale price when the sale is turned on", async () => {
    await expect(messagesFor({ isOnSale: true })).resolves.toEqual({
      salePrice: expect.arrayContaining([
        "El precio de oferta tiene que ser un monto con hasta 2 decimales, como 1500.50.",
      ]) as unknown,
    });
  });

  it.each([
    [{ salePrice: "100" }, "salePrice"],
    [{ isOnSale: false, saleEndsAt: "2099-01-01T00:00:00.000Z" }, "saleEndsAt"],
    [{ newUntil: "2099-01-01T00:00:00.000Z" }, "newUntil"],
  ])("refuses %o outside its block", async (body, field) => {
    const messages = await messagesFor(body);

    expect(Object.keys(messages)).toEqual([field]);
  });

  it.each([
    [{ categoryIds: [ID] }, "primaryCategoryId"],
    [{ primaryCategoryId: ID }, "categoryIds"],
  ])("asks for the categories and their primary one together: %o", async (body, field) => {
    const messages = await messagesFor(body);

    expect(Object.keys(messages)).toEqual([field]);
  });
});
