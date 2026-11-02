import type { ConfigService } from "@nestjs/config";
import type { Pool } from "pg";
import type { Env } from "../../src/config/env.js";
import { Session } from "../../src/modules/identity/domain/entities/session.js";
import { DrizzleSessionRepository } from "../../src/modules/identity/infrastructure/persistence/drizzle-session.repository.js";
import { DrizzleClient } from "../../src/shared/infrastructure/database/drizzle.client.js";
import { DrizzleExecutor } from "../../src/shared/infrastructure/database/drizzle.executor.js";
import { adminPool, insertUser, truncateAll } from "./db-test-utils.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

const NOW = new Date("2026-10-20T12:00:00.000Z");
const IN_A_WEEK = new Date("2026-10-27T12:00:00.000Z");
let counter = 0;
const nextId = () => `4f9c1f43-6f4b-4d5c-9a3e-${String(++counter).padStart(12, "0")}`;

describe("DrizzleSessionRepository (e2e)", () => {
  let pool: Pool;
  let client: DrizzleClient;
  let repository: DrizzleSessionRepository;
  let userId: string;

  const start = (overrides: { tokenHash?: string; expiresAt?: Date; forUser?: string } = {}) =>
    Session.start({
      id: nextId(),
      userId: overrides.forUser ?? userId,
      refreshTokenHash: overrides.tokenHash ?? `hash-${counter}`,
      expiresAt: overrides.expiresAt ?? IN_A_WEEK,
      userAgent: "Mozilla/5.0",
      now: NOW,
    });

  beforeAll(() => {
    pool = adminPool();
    // Runs with the runtime role, so it also checks that role can write the table.
    const values: Record<string, unknown> = {
      DATABASE_URL: process.env.DATABASE_URL,
      DATABASE_SSL_MODE: process.env.DATABASE_SSL_MODE ?? "disable",
      DATABASE_SSL_CA: process.env.DATABASE_SSL_CA,
      DATABASE_POOL_MAX: 2,
    };
    client = new DrizzleClient({ get: (key: string) => values[key] } as ConfigService<Env, true>);
    repository = new DrizzleSessionRepository(new DrizzleExecutor(client));
  });

  beforeEach(async () => {
    await truncateAll(pool);
    userId = await insertUser(pool);
  });

  afterAll(async () => {
    await truncateAll(pool);
    await client.onApplicationShutdown();
    await pool.end();
  });

  it("stores a session that reads back the same by its token hash", async () => {
    const session = start({ tokenHash: "token-hash" });

    await repository.save(session);
    const stored = await repository.findByTokenHash("token-hash");

    expect(stored?.getId()).toBe(session.getId());
    expect(stored).toMatchObject({
      userId,
      refreshTokenHash: "token-hash",
      expiresAt: IN_A_WEEK,
      userAgent: "Mozilla/5.0",
      createdAt: NOW,
      revokedAt: undefined,
    });
  });

  it("returns null for an unknown token hash", async () => {
    await expect(repository.findByTokenHash("unknown")).resolves.toBeNull();
  });

  it("does not revive a session revoked after it was read", async () => {
    await repository.save(start({ tokenHash: "token-hash" }));
    const stale = await repository.findByTokenHash("token-hash");

    await repository.revokeAllForUser(userId, NOW);
    await repository.save(stale!);

    expect((await repository.findByTokenHash("token-hash"))?.revokedAt).toEqual(NOW);
  });

  it("stores the revocation of an existing session", async () => {
    const session = start({ tokenHash: "token-hash" });
    await repository.save(session);

    session.revoke(NOW);
    await repository.save(session);

    expect((await repository.findByTokenHash("token-hash"))?.revokedAt).toEqual(NOW);
  });

  it("revokes every active session of a user and leaves the others alone", async () => {
    const otherUser = await insertUser(pool);
    const alreadyRevokedAt = new Date("2026-10-19T00:00:00.000Z");
    const first = start({ tokenHash: "first" });
    const second = start({ tokenHash: "second" });
    const revoked = start({ tokenHash: "revoked" });
    revoked.revoke(alreadyRevokedAt);
    const others = start({ tokenHash: "others", forUser: otherUser });
    for (const session of [first, second, revoked, others]) {
      await repository.save(session);
    }

    await repository.revokeAllForUser(userId, NOW);

    expect((await repository.findByTokenHash("first"))?.revokedAt).toEqual(NOW);
    expect((await repository.findByTokenHash("second"))?.revokedAt).toEqual(NOW);
    expect((await repository.findByTokenHash("revoked"))?.revokedAt).toEqual(alreadyRevokedAt);
    expect((await repository.findByTokenHash("others"))?.revokedAt).toBeUndefined();
  });

  it("deletes the sessions that expired before a date and returns how many", async () => {
    await repository.save(start({ tokenHash: "old", expiresAt: new Date("2026-10-20T13:00:00Z") }));
    await repository.save(
      start({ tokenHash: "older", expiresAt: new Date("2026-10-20T12:30:00Z") }),
    );
    await repository.save(start({ tokenHash: "current" }));

    await expect(repository.deleteExpiredBefore(new Date("2026-10-21T00:00:00Z"))).resolves.toBe(2);
    await expect(repository.findByTokenHash("old")).resolves.toBeNull();
    await expect(repository.findByTokenHash("current")).resolves.not.toBeNull();
  });

  it("deletes nothing when no session expired", async () => {
    await repository.save(start());

    await expect(repository.deleteExpiredBefore(NOW)).resolves.toBe(0);
  });
});
