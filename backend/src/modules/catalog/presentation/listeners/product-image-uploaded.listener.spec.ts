import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ProductImageUploadedEvent } from "../../application/events/product-image-uploaded.event.js";
import type { ProcessProductImageUseCase } from "../../application/use-cases/process-product-image.use-case.js";
import { ProductImageUploadedListener } from "./product-image-uploaded.listener.js";

function setUp(execute: () => Promise<unknown>) {
  const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  const process = { execute: vi.fn(execute) };
  const listener = new ProductImageUploadedListener(
    process as unknown as ProcessProductImageUseCase,
  );
  return { listener, process, log, error };
}

describe("ProductImageUploadedListener", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("processes the image of each event, logging how it went", async () => {
    const { listener, process, log } = setUp(() => Promise.resolve("processed"));

    await listener.handle(new ProductImageUploadedEvent("image-1"));

    expect(process.execute).toHaveBeenCalledExactlyOnceWith("image-1");
    expect(log).toHaveBeenCalledExactlyOnceWith("Image image-1 processed");
  });

  it("logs a failure instead of rejecting, so the next events still go out", async () => {
    const { listener, error } = setUp(() =>
      Promise.reject(new Error("Processing of image image-1 failed")),
    );

    await expect(
      listener.handle(new ProductImageUploadedEvent("image-1")),
    ).resolves.toBeUndefined();

    expect(error.mock.calls[0][0]).toMatch(
      /^Processing image image-1 went wrong\nError: Processing of image image-1 failed/,
    );
  });
});
