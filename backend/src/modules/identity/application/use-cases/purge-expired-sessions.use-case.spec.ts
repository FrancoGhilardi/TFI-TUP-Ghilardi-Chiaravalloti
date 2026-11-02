import { Clock } from "../../../../shared/application/clock.js";
import { SessionRepository } from "../../domain/repositories/session.repository.js";
import { PurgeExpiredSessionsUseCase } from "./purge-expired-sessions.use-case.js";

const NOW = new Date("2026-11-01T06:00:00.000Z");

class FixedClock extends Clock {
  now(): Date {
    return NOW;
  }
}

class CountingSessions extends SessionRepository {
  readonly cutoffs: Date[] = [];

  constructor(private readonly expired: number) {
    super();
  }

  deleteExpired(now: Date): Promise<number> {
    this.cutoffs.push(now);
    return Promise.resolve(this.expired);
  }

  findByTokenHash(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  findByTokenHashForUpdate(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  save(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  revokeFamily(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }

  revokeAllForUser(): Promise<never> {
    return Promise.reject(new Error("Not used"));
  }
}

describe("PurgeExpiredSessionsUseCase", () => {
  it("deletes the sessions expired as of now and says how many", async () => {
    const sessions = new CountingSessions(3);

    await expect(
      new PurgeExpiredSessionsUseCase(sessions, new FixedClock()).execute(),
    ).resolves.toEqual({ deleted: 3 });
    expect(sessions.cutoffs).toEqual([NOW]);
  });
});
