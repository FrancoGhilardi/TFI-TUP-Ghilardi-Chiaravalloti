/**
 * Runs work after the request that started it has been answered, so the response time does
 * not depend on what the work found.
 */
export abstract class BackgroundTasks {
  /** Starts the work without waiting for it; a failure is reported, never thrown back. */
  abstract run(name: string, work: () => Promise<unknown>): void;
}
