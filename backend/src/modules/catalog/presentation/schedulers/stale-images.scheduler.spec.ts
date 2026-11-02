import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { BackgroundTasks } from "../../../../shared/application/background-tasks.js";
import type { StaleImagesResult } from "../../application/dto/stale-images.result.js";
import type { ReprocessStaleImagesUseCase } from "../../application/use-cases/reprocess-stale-images.use-case.js";
import { STALE_IMAGES_JOB, StaleImagesScheduler } from "./stale-images.scheduler.js";

const NOTHING: StaleImagesResult = { processed: 0, skipped: 0, failures: [] };

class RecordingTasks extends BackgroundTasks {
  readonly names: string[] = [];
  readonly pending: Promise<unknown>[] = [];

  run(name: string, work: () => Promise<unknown>): void {
    this.names.push(name);
    this.pending.push(work());
  }
}

function setUp(execute: () => Promise<StaleImagesResult>) {
  const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  const reprocess = { execute: vi.fn(execute) };
  const background = new RecordingTasks();
  const scheduler = new StaleImagesScheduler(
    reprocess as unknown as ReprocessStaleImagesUseCase,
    background,
  );
  return { scheduler, reprocess, background, log, error };
}

describe("StaleImagesScheduler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs every 5 minutes", () => {
    const handler = Object.getOwnPropertyDescriptor(StaleImagesScheduler.prototype, "schedule")
      ?.value as object;

    expect(Reflect.getMetadata("SCHEDULE_CRON_OPTIONS", handler)).toEqual({
      cronTime: "*/5 * * * *",
      name: STALE_IMAGES_JOB,
    });
  });

  it("runs once in the background when the app starts", async () => {
    const { scheduler, reprocess, background } = setUp(() => Promise.resolve(NOTHING));

    scheduler.onApplicationBootstrap();
    await Promise.all(background.pending);

    expect(background.names).toEqual(["Reprocessing stalled images at startup"]);
    expect(reprocess.execute).toHaveBeenCalledOnce();
  });

  it("runs each scheduled time in the background, which closing waits for", async () => {
    const { scheduler, reprocess, background } = setUp(() => Promise.resolve(NOTHING));

    scheduler.schedule();
    await Promise.all(background.pending);

    expect(background.names).toEqual(["Reprocessing stalled images"]);
    expect(reprocess.execute).toHaveBeenCalledOnce();
  });

  it("tells the run going to stop once the app starts closing, and starts no other", async () => {
    let shouldStop: () => boolean = () => false;
    let finish: (result: StaleImagesResult) => void = () => undefined;
    const { scheduler, reprocess } = setUp(() => new Promise((resolve) => (finish = resolve)));
    reprocess.execute.mockImplementationOnce((stop?: () => boolean) => {
      shouldStop = stop ?? shouldStop;
      return new Promise((resolve) => (finish = resolve));
    });

    const going = scheduler.run();
    expect(shouldStop()).toBe(false);
    scheduler.onModuleDestroy();
    expect(shouldStop()).toBe(true);
    finish(NOTHING);
    await going;
    await scheduler.run();

    expect(reprocess.execute).toHaveBeenCalledOnce();
  });

  it("never starts a run while another one is going", async () => {
    let finish: (result: StaleImagesResult) => void = () => undefined;
    let calls = 0;
    // Only the first run stays going until finished.
    const { scheduler, reprocess } = setUp(() =>
      ++calls === 1
        ? new Promise<StaleImagesResult>((resolve) => (finish = resolve))
        : Promise.resolve(NOTHING),
    );

    const first = scheduler.run();
    await scheduler.run();
    finish(NOTHING);
    await first;
    await scheduler.run();

    expect(reprocess.execute).toHaveBeenCalledTimes(2);
  });

  it("logs what it did and each failure, without throwing", async () => {
    const { scheduler, log, error } = setUp(() =>
      Promise.resolve({
        processed: 2,
        skipped: 1,
        failures: [{ imageId: "image-9", cause: new Error("unreadable image") }],
      }),
    );

    await expect(scheduler.run()).resolves.toBeUndefined();

    expect(log).toHaveBeenCalledExactlyOnceWith("Stalled images: 2 processed, 1 skipped, 1 failed");
    expect(error.mock.calls[0][0]).toMatch(
      /^Processing stalled image image-9 failed\nError: unreadable image/,
    );
  });

  it("says nothing when there was nothing to do, and logs a failed run", async () => {
    const quiet = setUp(() => Promise.resolve(NOTHING));
    await quiet.scheduler.run();
    expect(quiet.log).not.toHaveBeenCalled();
    vi.restoreAllMocks();

    const broken = setUp(() => Promise.reject(new Error("database down")));
    await expect(broken.scheduler.run()).resolves.toBeUndefined();
    expect(broken.error.mock.calls[0][0]).toMatch(
      /^Reprocessing stalled images failed\nError: database down/,
    );
  });
});
