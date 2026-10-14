import { ConfigService } from "@nestjs/config";
import { sql } from "drizzle-orm";
import type { Env } from "../../src/config/env.js";
import { DrizzleClient } from "../../src/shared/infrastructure/database/drizzle.client.js";
import { DrizzleExecutor } from "../../src/shared/infrastructure/database/drizzle.executor.js";
import { DrizzleTransactionManager } from "../../src/shared/infrastructure/database/drizzle-transaction-manager.js";

try {
  process.loadEnvFile(process.env.ENV_FILE ?? ".env");
} catch {
  // Variables come from the environment.
}

describe("DrizzleTransactionManager (e2e)", () => {
  let client: DrizzleClient;
  let executor: DrizzleExecutor;
  let manager: DrizzleTransactionManager;

  const insert = (value: string) =>
    executor.current().execute(sql`insert into tx_probe (value) values (${value})`);
  const values = async () => {
    const result = await executor
      .current()
      .execute<{ value: string }>(sql`select value from tx_probe order by value`);
    return result.rows.map((row) => row.value);
  };

  beforeAll(async () => {
    const envValues: Record<string, unknown> = {
      DATABASE_URL: process.env.DATABASE_MIGRATION_URL,
      DATABASE_SSL_MODE: process.env.DATABASE_SSL_MODE ?? "disable",
      DATABASE_SSL_CA: process.env.DATABASE_SSL_CA,
      // A single connection keeps the temporary table visible to every statement.
      DATABASE_POOL_MAX: 1,
    };
    const config = { get: (key: string) => envValues[key] } as ConfigService<Env, true>;
    client = new DrizzleClient(config);
    executor = new DrizzleExecutor(client);
    manager = new DrizzleTransactionManager(client, executor);
    await client.db.execute(sql`create temp table tx_probe (value text not null)`);
  });

  beforeEach(async () => {
    await client.db.execute(sql`truncate tx_probe`);
  });

  afterAll(async () => {
    await client.onApplicationShutdown();
  });

  it("commits what was written inside run", async () => {
    await manager.run(() => insert("committed"));

    expect(await values()).toEqual(["committed"]);
  });

  it("rolls back and rethrows the original error when the work fails", async () => {
    const failure = new Error("boom");

    await expect(
      manager.run(async () => {
        await insert("discarded");
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(await values()).toEqual([]);
  });

  it("joins the outer transaction when nested", async () => {
    await expect(
      manager.run(async () => {
        await insert("outer");
        await manager.run(() => insert("inner"));
        throw new Error("rollback outer");
      }),
    ).rejects.toThrow("rollback outer");

    expect(await values()).toEqual([]);
  });
});
