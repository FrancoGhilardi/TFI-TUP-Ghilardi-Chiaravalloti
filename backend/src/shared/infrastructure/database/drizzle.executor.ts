import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable } from "@nestjs/common";
import { type Database, DrizzleClient } from "./drizzle.client.js";

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbExecutor = Database | Transaction;

@Injectable()
export class DrizzleExecutor {
  private readonly storage = new AsyncLocalStorage<Transaction>();

  constructor(private readonly client: DrizzleClient) {}

  current(): DbExecutor {
    return this.storage.getStore() ?? this.client.db;
  }

  hasActiveTransaction(): boolean {
    return this.storage.getStore() !== undefined;
  }

  runInContext<T>(tx: Transaction, work: () => Promise<T>): Promise<T> {
    return this.storage.run(tx, work);
  }
}
