import { type DbExecutor, DrizzleExecutor, type Transaction } from "./drizzle.executor.js";
import type { DrizzleClient } from "./drizzle.client.js";

describe("DrizzleExecutor", () => {
  const db = { name: "db" } as unknown as DbExecutor;
  const txA = { name: "txA" } as unknown as Transaction;
  const txB = { name: "txB" } as unknown as Transaction;
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  let executor: DrizzleExecutor;

  beforeEach(() => {
    executor = new DrizzleExecutor({ db } as unknown as DrizzleClient);
  });

  it("returns the database outside of a transaction", () => {
    expect(executor.current()).toBe(db);
    expect(executor.hasActiveTransaction()).toBe(false);
  });

  it("returns the transaction inside a context, also after an await", async () => {
    await executor.runInContext(txA, async () => {
      await tick();

      expect(executor.current()).toBe(txA);
      expect(executor.hasActiveTransaction()).toBe(true);
    });
  });

  it("does not leak the transaction after the context ends", async () => {
    await executor.runInContext(txA, () => Promise.resolve());

    expect(executor.current()).toBe(db);
  });

  it("keeps concurrent contexts isolated", async () => {
    const seen = await Promise.all([
      executor.runInContext(txA, async () => {
        await tick();
        return executor.current();
      }),
      executor.runInContext(txB, () => Promise.resolve(executor.current())),
    ]);

    expect(seen).toEqual([txA, txB]);
  });
});
