import type { ConfigService } from "@nestjs/config";
import type { Pool } from "pg";
import type { Env } from "../../src/config/env.js";
import { Session } from "../../src/modules/identity/domain/entities/session.js";
import { DrizzleSessionRepository } from "../../src/modules/identity/infrastructure/persistence/drizzle-session.repository.js";
import { DrizzleClient } from "../../src/shared/infrastructure/database/drizzle.client.js";
import { DrizzleExecutor } from "../../src/shared/infrastructure/database/drizzle.executor.js";
import { DrizzleTransactionManager } from "../../src/shared/infrastructure/database/drizzle-transaction-manager.js";
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
  let transactions: DrizzleTransactionManager;
  let userId: string;

  const start = (
    overrides: { tokenHash?: string; expiresAt?: Date; forUser?: string; familyId?: string } = {},
  ) =>
    Session.start({
      id: nextId(),
      userId: overrides.forUser ?? userId,
      refreshTokenHash: overrides.tokenHash ?? `hash-${counter}`,
      familyId: overrides.familyId,
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
    const executor = new DrizzleExecutor(client);
    repository = new DrizzleSessionRepository(executor);
    transactions = new DrizzleTransactionManager(client, executor);
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
      familyId: session.getId(),
      expiresAt: IN_A_WEEK,
      userAgent: "Mozilla/5.0",
      createdAt: NOW,
      revokedAt: undefined,
      rotatedAt: undefined,
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

  it("stores the rotation of an existing session", async () => {
    const session = start({ tokenHash: "token-hash" });
    await repository.save(session);

    session.rotate(NOW);
    await repository.save(session);

    const stored = await repository.findByTokenHash("token-hash");
    expect(stored?.revokedAt).toEqual(NOW);
    expect(stored?.rotatedAt).toEqual(NOW);
  });

  it("does not undo a rotation with a stale copy", async () => {
    const session = start({ tokenHash: "token-hash" });
    await repository.save(session);
    const stale = await repository.findByTokenHash("token-hash");

    session.rotate(NOW);
    await repository.save(session);
    await repository.save(stale!);

    expect((await repository.findByTokenHash("token-hash"))?.rotatedAt).toEqual(NOW);
  });

  it("lets the database refuse a rotated session that is not revoked", async () => {
    await repository.save(start({ tokenHash: "token-hash" }));

    await expect(
      pool.query(
        "UPDATE libreria.sessions SET rotated_at = now() WHERE refresh_token_hash = 'token-hash'",
      ),
    ).rejects.toMatchObject({ code: "23514", constraint: "chk_sessions_rotated_is_revoked" });
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

  it("stores the family of a session that replaced another", async () => {
    const first = start({ tokenHash: "first" });
    await repository.save(first);
    await repository.save(start({ tokenHash: "second", familyId: first.familyId }));

    expect((await repository.findByTokenHash("second"))?.familyId).toBe(first.getId());
  });

  it("revokes every active session of a family and leaves other families alone", async () => {
    const alreadyRevokedAt = new Date("2026-10-19T00:00:00.000Z");
    const first = start({ tokenHash: "first" });
    first.rotate(alreadyRevokedAt);
    const second = start({ tokenHash: "second", familyId: first.familyId });
    const otherLogin = start({ tokenHash: "other-login" });
    for (const session of [first, second, otherLogin]) {
      await repository.save(session);
    }

    await repository.revokeFamily(first.familyId, NOW);

    expect((await repository.findByTokenHash("first"))?.revokedAt).toEqual(alreadyRevokedAt);
    expect((await repository.findByTokenHash("second"))?.revokedAt).toEqual(NOW);
    expect((await repository.findByTokenHash("other-login"))?.revokedAt).toBeUndefined();
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

  describe("locking", () => {
    const REVOKE = "UPDATE libreria.sessions SET revoked_at = now() WHERE refresh_token_hash = $1";

    const lockedReadAndRevocation = async (read: (tokenHash: string) => Promise<unknown>) => {
      await repository.save(start({ tokenHash: "token-hash" }));
      const finished: string[] = [];
      let markRead: () => void = () => undefined;
      const wasRead = new Promise<void>((resolve) => {
        markRead = resolve;
      });

      const transaction = transactions.run(async () => {
        await read("token-hash");
        markRead();
        await new Promise((resolve) => setTimeout(resolve, 300));
        finished.push("transaction");
      });
      await wasRead;
      const revocation = pool.query(REVOKE, ["token-hash"]).then(() => finished.push("revocation"));
      await Promise.all([transaction, revocation]);
      return finished;
    };

    it("findByTokenHashForUpdate keeps the session locked until the transaction ends", async () => {
      // A concurrent revocation has to wait for the transaction to finish.
      await expect(
        lockedReadAndRevocation((hash) => repository.findByTokenHashForUpdate(hash)),
      ).resolves.toEqual(["transaction", "revocation"]);
    });

    it("findByTokenHash takes no lock, even inside a transaction", async () => {
      await expect(
        lockedReadAndRevocation((hash) => repository.findByTokenHash(hash)),
      ).resolves.toEqual(["revocation", "transaction"]);
    });

    it("findByTokenHashForUpdate refuses to run outside a transaction", async () => {
      await expect(repository.findByTokenHashForUpdate("token-hash")).rejects.toThrow(
        "findByTokenHashForUpdate must run inside a transaction",
      );
    });

    it("findByTokenHash takes no lock outside a transaction either", async () => {
      await repository.save(start({ tokenHash: "token-hash" }));
      const locker = await pool.connect();
      try {
        await locker.query("BEGIN");
        await locker.query(
          "SELECT id FROM libreria.sessions WHERE refresh_token_hash = $1 FOR UPDATE",
          ["token-hash"],
        );

        // Would wait for the lock if the read tried to take it.
        await expect(repository.findByTokenHash("token-hash")).resolves.not.toBeNull();
      } finally {
        await locker.query("ROLLBACK");
        locker.release();
      }
    });
  });
});
