import "reflect-metadata";
import { Logger } from "@nestjs/common";
import type { PurgeExpiredSessionsUseCase } from "../../application/use-cases/purge-expired-sessions.use-case.js";
import { SESSIONS_CLEANUP_JOB, SessionsCleanupScheduler } from "./sessions-cleanup.scheduler.js";

function setUp(execute: () => Promise<unknown>) {
  const log = vi.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  const scheduler = new SessionsCleanupScheduler({
    execute: vi.fn(execute),
  } as unknown as PurgeExpiredSessionsUseCase);
  return { scheduler, log, error };
}

describe("SessionsCleanupScheduler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs every day at 3 a.m. in Argentina", () => {
    const handler = Object.getOwnPropertyDescriptor(SessionsCleanupScheduler.prototype, "run")
      ?.value as object;

    expect(Reflect.getMetadata("SCHEDULE_CRON_OPTIONS", handler)).toEqual({
      cronTime: "0 3 * * *",
      name: SESSIONS_CLEANUP_JOB,
      timeZone: "America/Argentina/Buenos_Aires",
    });
  });

  it("logs how many sessions it deleted, and nothing when there were none", async () => {
    const { scheduler, log, error } = setUp(() => Promise.resolve({ deleted: 4 }));
    await scheduler.run();
    expect(log).toHaveBeenCalledExactlyOnceWith("Deleted 4 expired sessions");
    expect(error).not.toHaveBeenCalled();
    vi.restoreAllMocks();

    const quiet = setUp(() => Promise.resolve({ deleted: 0 }));
    await quiet.scheduler.run();
    expect(quiet.log).not.toHaveBeenCalled();
  });

  it("logs a failure instead of throwing it", async () => {
    const { scheduler, error } = setUp(() => Promise.reject(new Error("database down")));

    await expect(scheduler.run()).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0][0]).toMatch(
      /^Deleting expired sessions failed\nError: database down/,
    );
  });
});
