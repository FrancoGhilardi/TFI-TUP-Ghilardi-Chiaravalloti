import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable } from "@nestjs/common";
import { type Database, DrizzleClient } from "./drizzle.client.js";

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbExecutor = Database | Transaction;

/**
 * Gives repositories the active transaction, if any, so they do not receive it as a
 * parameter. The transaction travels through the async context.
 */
@Injectable()
export class DrizzleExecutor {
  private readonly storage = new AsyncLocalStorage<Transaction>();

  constructor(private readonly client: DrizzleClient) {}

  /** The open transaction, or the plain client when there is none. */
  current(): DbExecutor {
    return this.storage.getStore() ?? this.client.db;
  }

  /** Whether the current async context is inside a transaction. */
  hasActiveTransaction(): boolean {
    return this.storage.getStore() !== undefined;
  }

  /** Runs `work` so that `current()` returns `tx` for everything it awaits. */
  runInContext<T>(tx: Transaction, work: () => Promise<T>): Promise<T> {
    return this.storage.run(tx, work);
  }
}
