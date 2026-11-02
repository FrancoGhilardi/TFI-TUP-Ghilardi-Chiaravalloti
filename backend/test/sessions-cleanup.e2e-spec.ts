import { createHash } from "node:crypto";
import { type INestApplication, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import type { Pool } from "pg";
import request from "supertest";
import type { App } from "supertest/types.js";
import type { Env } from "./../src/config/env.js";
import {
  SESSIONS_CLEANUP_JOB,
  SessionsCleanupScheduler,
} from "./../src/modules/identity/presentation/schedulers/sessions-cleanup.scheduler.js";
import { Clock } from "./../src/shared/application/clock.js";
import { createTestApp } from "./create-test-app.js";
import { adminPool, insertUser, truncateAll } from "./database/db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

// 3 a.m. in Argentina, when the job runs.
const RUN = new Date("2026-11-01T06:00:00.000Z");
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const at = (offsetMs: number) => new Date(RUN.getTime() + offsetMs);

const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");

/** A clock stopped at the time the job runs. */
class FixedClock extends Clock {
  now(): Date {
    return RUN;
  }
}

describe("Deleting expired sessions (e2e)", () => {
  let app: INestApplication<App>;
  let pool: Pool;
  let scheduler: SessionsCleanupScheduler;
  let userId: string;
  let logged: string[];

  beforeAll(() => {
    pool = adminPool();
  });

  beforeEach(async () => {
    await truncateAll(pool);
    app = await createTestApp({ overrides: [{ provide: Clock, useValue: new FixedClock() }] });
    scheduler = app.get(SessionsCleanupScheduler);
    userId = await insertUser(pool);
    logged = [];
    vi.spyOn(Logger.prototype, "log").mockImplementation((message: unknown) => {
      logged.push(String(message));
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  afterAll(async () => {
    await truncateAll(pool);
    await pool.end();
  });

  /** A session of the user for the token, expiring at `expiresAt`. */
  async function session(
    token: string,
    expiresAt: Date,
    options: { revoked?: boolean; rotated?: boolean } = {},
  ): Promise<void> {
    const revokedAt = options.revoked || options.rotated ? at(-3 * DAY_MS) : null;
    await pool.query(
      `INSERT INTO libreria.sessions
         (user_id, refresh_token_hash, family_id, expires_at, created_at, revoked_at, rotated_at)
       VALUES ($1, $2, gen_random_uuid(), $3, $4, $5, $6)`,
      [
        userId,
        hashOf(token),
        expiresAt,
        at(-8 * DAY_MS),
        revokedAt,
        options.rotated ? revokedAt : null,
      ],
    );
  }

  const remaining = async () =>
    (
      await pool.query<{ refresh_token_hash: string }>(
        "SELECT refresh_token_hash FROM libreria.sessions ORDER BY expires_at",
      )
    ).rows.map((row) => row.refresh_token_hash);

  it("registers the job to run at the next 3 a.m. in Argentina", () => {
    const job = app.get(SchedulerRegistry).getCronJob(SESSIONS_CLEANUP_JOB);
    const next = job.nextDate().toJSDate();

    // Read in Argentina, so the check holds whatever its offset from UTC is.
    const inArgentina = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(next);

    expect(job.isActive).toBe(false);
    expect(inArgentina).toBe("03:00");
    expect(next.getTime()).toBeGreaterThan(Date.now());
  });

  it("deletes only the expired sessions, revoked or not, and nothing more when run again", async () => {
    await session("expired-yesterday", at(-DAY_MS));
    await session("revoked-expired", at(-HOUR_MS), { revoked: true });
    await session("rotated-expired", at(-2 * HOUR_MS), { rotated: true });
    await session("expiring-now", RUN);
    await session("one-ms-left", at(1));
    await session("revoked-running", at(DAY_MS), { revoked: true });
    await session("running", at(2 * DAY_MS));

    await scheduler.run();
    const left = await remaining();
    await scheduler.run();

    expect(left).toEqual([hashOf("one-ms-left"), hashOf("revoked-running"), hashOf("running")]);
    await expect(remaining()).resolves.toEqual(left);
    expect(logged).toEqual(["Deleted 4 expired sessions"]);
  });

  it("leaves a running session working", async () => {
    await session("expired", at(-DAY_MS));
    await session("running", at(DAY_MS));
    const origin = new URL(app.get(ConfigService<Env, true>).get("FRONTEND_URL", { infer: true }))
      .origin;

    await scheduler.run();

    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .set("Origin", origin)
      .set("Cookie", "__Secure-refresh_token=running")
      .expect(200);
  });
});
