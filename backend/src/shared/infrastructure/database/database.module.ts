import { Global, Module } from "@nestjs/common";
import { DatabaseHealthCheck } from "../../application/database-health-check.js";
import { TransactionManager } from "../../application/transaction-manager.js";
import { DrizzleClient } from "./drizzle.client.js";
import { DrizzleDatabaseHealthCheck } from "./drizzle-database-health-check.js";
import { DrizzleExecutor } from "./drizzle.executor.js";
import { DrizzleTransactionManager } from "./drizzle-transaction-manager.js";

@Global()
@Module({
  providers: [
    DrizzleClient,
    DrizzleExecutor,
    { provide: TransactionManager, useClass: DrizzleTransactionManager },
    { provide: DatabaseHealthCheck, useClass: DrizzleDatabaseHealthCheck },
  ],
  exports: [DrizzleClient, DrizzleExecutor, TransactionManager, DatabaseHealthCheck],
})
export class DatabaseModule {}
