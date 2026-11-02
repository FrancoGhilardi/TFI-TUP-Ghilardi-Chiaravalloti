import "reflect-metadata";
import { Logger } from "@nestjs/common";
import type { ExpireProductMarksUseCase } from "../../application/use-cases/expire-product-marks.use-case.js";
import {
  PRODUCT_MARKS_EXPIRY_JOB,
  ProductMarksExpiryScheduler,
} from "./product-marks-expiry.scheduler.js";

function setUp(execute: () => Promise<unknown>) {
  const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  const scheduler = new ProductMarksExpiryScheduler({
    execute: vi.fn(execute),
  } as unknown as ExpireProductMarksUseCase);
  return { scheduler, log, error };
}

describe("ProductMarksExpiryScheduler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs every day at midnight in Argentina", () => {
    const handler = Object.getOwnPropertyDescriptor(ProductMarksExpiryScheduler.prototype, "run")
      ?.value as object;

    expect(Reflect.getMetadata("SCHEDULE_CRON_OPTIONS", handler)).toEqual({
      cronTime: "0 0 * * *",
      name: PRODUCT_MARKS_EXPIRY_JOB,
      timeZone: "America/Argentina/Buenos_Aires",
    });
  });

  it("logs how many sales and new marks it cleared", async () => {
    const { scheduler, log, error } = setUp(() => Promise.resolve({ sales: 2, newMarks: 1 }));

    await scheduler.run();

    expect(log).toHaveBeenCalledExactlyOnceWith("Cleared 2 ended sales and 1 ended new marks");
    expect(error).not.toHaveBeenCalled();
  });

  it("logs a failure instead of throwing it", async () => {
    const { scheduler, error } = setUp(() => Promise.reject(new Error("database down")));

    await expect(scheduler.run()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0][0]).toMatch(
      /^Clearing ended sales and new marks failed\nError: database down/,
    );
  });
});
