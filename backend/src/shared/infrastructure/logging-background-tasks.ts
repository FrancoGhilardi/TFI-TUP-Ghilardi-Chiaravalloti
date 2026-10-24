import { type BeforeApplicationShutdown, Injectable, Logger } from "@nestjs/common";
import { BackgroundTasks } from "../application/background-tasks.js";

/**
 * Runs each task in the same process once the current request is done, and logs its failure.
 * Once the app starts closing no new task starts, and the running ones are awaited before the
 * database pool is shut down.
 */
@Injectable()
export class LoggingBackgroundTasks extends BackgroundTasks implements BeforeApplicationShutdown {
  private readonly logger = new Logger(BackgroundTasks.name);
  private readonly pending = new Set<Promise<void>>();
  private closing = false;

  run(name: string, work: () => Promise<unknown>): void {
    if (this.closing) {
      this.logger.warn(`${name} skipped: the app is shutting down`);
      return;
    }
    const task = new Promise<void>((resolve) => setImmediate(resolve))
      .then(work)
      .then(
        () => undefined,
        (error: unknown) => {
          this.logger.error(`${name} failed`, error instanceof Error ? error.stack : String(error));
        },
      )
      .finally(() => this.pending.delete(task));
    this.pending.add(task);
  }

  async beforeApplicationShutdown(): Promise<void> {
    this.closing = true;
    await this.idle();
  }

  /** Resolves once no task is running, including the ones added while it waits. */
  async idle(): Promise<void> {
    while (this.pending.size > 0) {
      await Promise.all(this.pending);
    }
  }
}
