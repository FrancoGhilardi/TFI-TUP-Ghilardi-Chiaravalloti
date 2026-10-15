import { Injectable } from "@nestjs/common";
import { TransactionManager } from "../../application/transaction-manager.js";
import { DrizzleClient } from "./drizzle.client.js";
import { DrizzleExecutor } from "./drizzle.executor.js";

/** `TransactionManager` backed by Drizzle; the transaction is exposed through `DrizzleExecutor`. */
@Injectable()
export class DrizzleTransactionManager extends TransactionManager {
  constructor(
    private readonly client: DrizzleClient,
    private readonly executor: DrizzleExecutor,
  ) {
    super();
  }

  run<T>(work: () => Promise<T>): Promise<T> {
    // Nested calls join the outer transaction so a use case can call another one atomically.
    if (this.executor.hasActiveTransaction()) {
      return work();
    }
    return this.client.db.transaction((tx) => this.executor.runInContext(tx, work));
  }
}
