import type { Clock } from "../../../../shared/application/clock.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import type { SessionRepository } from "../../domain/repositories/session.repository.js";
import type { PurgedSessionsResult } from "../dto/purged-sessions.result.js";

/**
 * Deletes the sessions that already expired, which no refresh can use any more. One still
 * running stays, even if revoked, so reusing its token is still caught. Safe to run any number
 * of times: what is deleted is not found again.
 */
export class PurgeExpiredSessionsUseCase implements UseCase<void, PurgedSessionsResult> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<PurgedSessionsResult> {
    return { deleted: await this.sessions.deleteExpired(this.clock.now()) };
  }
}
