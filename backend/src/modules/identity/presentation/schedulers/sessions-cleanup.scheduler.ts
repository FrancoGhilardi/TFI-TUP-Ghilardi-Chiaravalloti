import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { BackgroundTasks } from "../../../../shared/application/background-tasks.js";
import { stackWithCauses } from "../../../../shared/application/error-stack.js";
import { PurgeExpiredSessionsUseCase } from "../../application/use-cases/purge-expired-sessions.use-case.js";

/** The job's name in the scheduler registry. */
export const SESSIONS_CLEANUP_JOB = "sessions-cleanup";

/**
 * Every day at 3 a.m. in Argentina, deletes the sessions that expired. An expired session is
 * already refused at its end, so nothing waits for this: it only keeps the table small. The run
 * goes through the background tasks, which the app waits for before closing.
 */
@Injectable()
export class SessionsCleanupScheduler {
  private readonly logger = new Logger(SessionsCleanupScheduler.name);

  constructor(
    private readonly purgeExpiredSessions: PurgeExpiredSessionsUseCase,
    private readonly background: BackgroundTasks,
  ) {}

  @Cron("0 3 * * *", {
    name: SESSIONS_CLEANUP_JOB,
    timeZone: "America/Argentina/Buenos_Aires",
  })
  schedule(): void {
    this.background.run("Deleting expired sessions", () => this.run());
  }

  async run(): Promise<void> {
    try {
      const { deleted } = await this.purgeExpiredSessions.execute();
      if (deleted > 0) {
        this.logger.log(`Deleted ${deleted} expired sessions`);
      }
    } catch (error) {
      // A single text, so the logger never takes the details for its context.
      this.logger.error(`Deleting expired sessions failed\n${stackWithCauses(error)}`);
    }
  }
}
