import { Logger } from "@nestjs/common";
import { LoggingBackgroundTasks } from "./logging-background-tasks.js";

describe("LoggingBackgroundTasks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns before the work starts", () => {
    const work = vi.fn(() => Promise.resolve());

    new LoggingBackgroundTasks().run("Some task", work);

    expect(work).not.toHaveBeenCalled();
  });

  it("runs the work afterwards and waits for it when the app closes", async () => {
    const tasks = new LoggingBackgroundTasks();
    const done: string[] = [];

    tasks.run("Some task", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      done.push("work");
    });
    await tasks.beforeApplicationShutdown();

    expect(done).toEqual(["work"]);
  });

  it("logs a failure with its stack instead of throwing it", async () => {
    const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const tasks = new LoggingBackgroundTasks();
    const failure = new Error("mail provider down");

    tasks.run("Password reset request", () => Promise.reject(failure));
    await tasks.beforeApplicationShutdown();

    expect(error).toHaveBeenCalledExactlyOnceWith(
      `Password reset request failed\n${failure.stack}`,
    );
  });

  it("starts no new task once the app is closing, and says so", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const tasks = new LoggingBackgroundTasks();
    const work = vi.fn(() => Promise.resolve());
    await tasks.beforeApplicationShutdown();

    tasks.run("Password reset request", work);
    await new Promise((resolve) => setImmediate(resolve));

    expect(work).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      "Password reset request skipped: the app is shutting down",
    );
  });

  it("waits until idle for tasks added by the running ones, and keeps accepting new ones", async () => {
    const tasks = new LoggingBackgroundTasks();
    const done: string[] = [];

    tasks.run("First", () => {
      tasks.run("Second", () => {
        done.push("second");
        return Promise.resolve();
      });
      done.push("first");
      return Promise.resolve();
    });
    await tasks.idle();
    tasks.run("Third", () => {
      done.push("third");
      return Promise.resolve();
    });
    await tasks.idle();

    expect(done).toEqual(["first", "second", "third"]);
  });

  it("logs what caused the failure too", async () => {
    const error = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const tasks = new LoggingBackgroundTasks();
    const cause = new Error("daily_quota_exceeded");

    tasks.run("Password reset request", () => Promise.reject(new Error("mail failed", { cause })));
    await tasks.idle();

    expect(error.mock.calls[0]?.[0]).toContain(`Caused by: ${cause.stack}`);
  });

  it("closes at once when nothing is running", async () => {
    await expect(new LoggingBackgroundTasks().beforeApplicationShutdown()).resolves.toBeUndefined();
  });
});
