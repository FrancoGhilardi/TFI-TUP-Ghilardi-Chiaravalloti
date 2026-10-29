import { Clock } from "../../../../shared/application/clock.js";
import type { ProductImage } from "../../domain/entities/product-image.js";
import { ProductImageRepository } from "../../domain/repositories/product-image.repository.js";
import { ImageSettings } from "../settings/image-settings.js";
import type {
  ImageProcessing,
  ProcessProductImageUseCase,
} from "./process-product-image.use-case.js";
import { ReprocessStaleImagesUseCase } from "./reprocess-stale-images.use-case.js";

const NOW = new Date("2026-10-29T12:00:00.000Z");

class FixedClock extends Clock {
  now(): Date {
    return NOW;
  }
}

class StaleImages extends ProductImageRepository {
  readonly asked: [Date, number][] = [];

  constructor(private readonly ids: string[]) {
    super();
  }

  findStalePendingIds(pendingBefore: Date, limit: number): Promise<string[]> {
    this.asked.push([pendingBefore, limit]);
    return Promise.resolve(this.ids.slice(0, limit));
  }

  findById(): Promise<ProductImage | null> {
    return Promise.reject(new Error("Not used"));
  }

  findByProduct(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  saveAll(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  delete(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  countByProduct(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

function setUp(ids: string[], outcomes: Record<string, ImageProcessing | Error>) {
  const log: string[] = [];
  const cutoffs: (Date | undefined)[] = [];
  const images = new StaleImages(ids);
  const process = {
    execute: async (imageId: string, options?: { pendingBefore?: Date }) => {
      cutoffs.push(options?.pendingBefore);
      log.push(`start ${imageId}`);
      await Promise.resolve();
      log.push(`end ${imageId}`);
      const outcome = outcomes[imageId];
      if (outcome instanceof Error) {
        throw outcome;
      }
      return outcome;
    },
  } as unknown as ProcessProductImageUseCase;
  const reprocess = new ReprocessStaleImagesUseCase(
    images,
    process,
    new ImageSettings(),
    new FixedClock(),
  );
  return { log, cutoffs, images, reprocess };
}

describe("ReprocessStaleImagesUseCase", () => {
  it("asks for the images pending for 10 minutes or more, 20 at most", async () => {
    const { images, reprocess } = setUp([], {});

    await expect(reprocess.execute()).resolves.toEqual({
      processed: 0,
      skipped: 0,
      failures: [],
    });
    expect(images.asked).toEqual([[new Date("2026-10-29T11:50:00.000Z"), 20]]);
  });

  it("processes them one after another, counting each outcome and going on after a failure", async () => {
    const failure = new Error("Processing of image b failed");
    const { log, reprocess } = setUp(["a", "b", "c", "d"], {
      a: "processed",
      b: failure,
      c: "skipped",
      d: "processed",
    });

    await expect(reprocess.execute()).resolves.toEqual({
      processed: 2,
      skipped: 1,
      failures: [{ imageId: "b", cause: failure }],
    });
    expect(log).toEqual([
      "start a",
      "end a",
      "start b",
      "end b",
      "start c",
      "end c",
      "start d",
      "end d",
    ]);
  });

  it("hands each processing the same cutoff, so one that began to wait later is left alone", async () => {
    const { cutoffs, reprocess } = setUp(["a", "b"], { a: "processed", b: "processed" });

    await reprocess.execute();

    expect(cutoffs).toEqual([
      new Date("2026-10-29T11:50:00.000Z"),
      new Date("2026-10-29T11:50:00.000Z"),
    ]);
  });

  it("starts no other image once told to stop", async () => {
    const { log, reprocess } = setUp(["a", "b", "c"], {
      a: "processed",
      b: "processed",
      c: "processed",
    });
    let asked = 0;

    await expect(reprocess.execute(() => ++asked > 1)).resolves.toMatchObject({ processed: 1 });
    expect(log).toEqual(["start a", "end a"]);
  });
});
