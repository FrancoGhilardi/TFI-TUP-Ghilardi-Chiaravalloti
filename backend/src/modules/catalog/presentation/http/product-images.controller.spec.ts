import "reflect-metadata";
import { HTTP_CODE_METADATA, PATH_METADATA } from "@nestjs/common/constants.js";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ROLES_KEY } from "../../../identity/presentation/decorators/roles.decorator.js";
import { Logger } from "@nestjs/common";
import type { AddProductImageUseCase } from "../../application/use-cases/add-product-image.use-case.js";
import type { DeleteProductImageUseCase } from "../../application/use-cases/delete-product-image.use-case.js";
import type { ReorderProductImagesUseCase } from "../../application/use-cases/reorder-product-images.use-case.js";
import type { ReplaceProductImageFileUseCase } from "../../application/use-cases/replace-product-image-file.use-case.js";
import type { RetryProductImageProcessingUseCase } from "../../application/use-cases/retry-product-image-processing.use-case.js";
import type { UpdateProductImageUseCase } from "../../application/use-cases/update-product-image.use-case.js";
import { ProductImagesController } from "./product-images.controller.js";
import { ReorderProductImagesRequestDto } from "./reorder-product-images.request.dto.js";
import { UpdateProductImageRequestDto } from "./update-product-image.request.dto.js";

const ID = "4f9c1f43-6f4b-4d5c-9a3e-0000000000a1";
const IMAGE = "4f9c1f43-6f4b-4d5c-9a3e-0000000000c1";

function setUp() {
  const useCase = () => ({ execute: vi.fn(() => Promise.resolve({ id: "image-1" })) });
  const add = useCase();
  const reorder = useCase();
  const update = useCase();
  const replace = useCase();
  const retry = useCase();
  const remove = {
    execute: vi.fn(() =>
      Promise.resolve({ imageId: IMAGE, leftovers: [] as { key: string; cause: unknown }[] }),
    ),
  };
  const controller = new ProductImagesController(
    add as unknown as AddProductImageUseCase,
    reorder as unknown as ReorderProductImagesUseCase,
    update as unknown as UpdateProductImageUseCase,
    replace as unknown as ReplaceProductImageFileUseCase,
    retry as unknown as RetryProductImageProcessingUseCase,
    remove as unknown as DeleteProductImageUseCase,
  );
  return { add, reorder, update, replace, retry, remove, controller };
}

const handler = (method: keyof ProductImagesController) =>
  Object.getOwnPropertyDescriptor(ProductImagesController.prototype, method)?.value as object;

async function messages<T extends object>(type: new () => T, body: Record<string, unknown>) {
  const dto = plainToInstance(type, body);
  const errors = await validate(dto);
  return { dto, fields: errors.map((error) => error.property) };
}

describe("ProductImagesController", () => {
  it("is open to admins and sellers", () => {
    expect(Reflect.getMetadata(ROLES_KEY, ProductImagesController)).toEqual(["ADMIN", "SELLER"]);
  });

  it("adds the file with its alt text to the product of the route", async () => {
    const { add, controller } = setUp();
    const buffer = Buffer.from([0xff, 0xd8, 0xff]);

    await expect(
      controller.add(ID, { altText: "Tapa" }, { buffer } as Express.Multer.File),
    ).resolves.toEqual({ id: "image-1" });

    expect(add.execute).toHaveBeenCalledExactlyOnceWith({
      productId: ID,
      image: { bytes: buffer, altText: "Tapa" },
    });
  });

  it("declares the order route before the one of an image, which would take it", () => {
    const paths = Object.getOwnPropertyNames(ProductImagesController.prototype)
      .filter((method) => method !== "constructor")
      .map(
        (method) =>
          Reflect.getMetadata(
            PATH_METADATA,
            handler(method as keyof ProductImagesController),
          ) as string,
      );

    expect(paths.indexOf("order")).toBeLessThan(paths.indexOf(":imageId"));
  });

  it("passes each change to its use case", async () => {
    const { reorder, update, replace, retry, controller } = setUp();
    const buffer = Buffer.from([1]);

    await controller.reorder(ID, { imageIds: [IMAGE] });
    await controller.update(ID, IMAGE, { altText: "Tapa" });
    await controller.replaceFile(ID, IMAGE, { buffer } as Express.Multer.File);
    await controller.retry(ID, IMAGE);

    expect(reorder.execute).toHaveBeenCalledExactlyOnceWith({ productId: ID, imageIds: [IMAGE] });
    expect(update.execute).toHaveBeenCalledExactlyOnceWith({
      productId: ID,
      imageId: IMAGE,
      altText: "Tapa",
    });
    expect(replace.execute).toHaveBeenCalledExactlyOnceWith({
      productId: ID,
      imageId: IMAGE,
      bytes: buffer,
    });
    expect(retry.execute).toHaveBeenCalledExactlyOnceWith({ productId: ID, imageId: IMAGE });
  });

  it("deletes with 204, logging the files the storage kept", async () => {
    const { remove, controller } = setUp();
    const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);

    await expect(controller.remove(ID, IMAGE)).resolves.toBeUndefined();
    expect(error).not.toHaveBeenCalled();

    remove.execute.mockResolvedValueOnce({
      imageId: IMAGE,
      leftovers: [
        { key: "a.jpg", cause: new Error("storage down") },
        { key: "b.webp", cause: new Error("timeout") },
      ],
    });
    await controller.remove(ID.toUpperCase(), IMAGE.toUpperCase());

    expect(remove.execute).toHaveBeenCalledWith({
      productId: ID.toUpperCase(),
      imageId: IMAGE.toUpperCase(),
    });
    expect(error.mock.calls.map(([message]) => String(message))).toEqual([
      expect.stringMatching(
        new RegExp(
          `^File a.jpg of the deleted image ${IMAGE} was left in storage\nError: storage down`,
        ),
      ),
      expect.stringMatching(/^File b\.webp .*\nError: timeout/),
    ]);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler("remove"))).toBe(204);
    error.mockRestore();
  });

  it("answers a retry with 200, as it creates nothing", () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler("retry"))).toBe(200);
  });
});

describe("ReorderProductImagesRequestDto", () => {
  it("takes the ids in lowercase", async () => {
    const { dto, fields } = await messages(ReorderProductImagesRequestDto, {
      imageIds: [IMAGE.toUpperCase(), ID],
    });

    expect(fields).toEqual([]);
    expect(dto.imageIds).toEqual([IMAGE, ID]);
  });

  it.each([[[]], [["not-an-id"]], [Array.from({ length: 6 }, () => IMAGE)], ["text"], [null]])(
    "refuses %o",
    async (imageIds) => {
      await expect(messages(ReorderProductImagesRequestDto, { imageIds })).resolves.toMatchObject({
        fields: ["imageIds"],
      });
    },
  );
});

describe("UpdateProductImageRequestDto", () => {
  it.each(["Tapa", ""])("takes the alt text %o", async (altText) => {
    await expect(messages(UpdateProductImageRequestDto, { altText })).resolves.toMatchObject({
      fields: [],
    });
  });

  it.each([{}, { altText: null }, { altText: 3 }])("refuses %o", async (body) => {
    await expect(messages(UpdateProductImageRequestDto, body)).resolves.toMatchObject({
      fields: ["altText"],
    });
  });
});
