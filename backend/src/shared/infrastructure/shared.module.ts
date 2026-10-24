import { Global, Module } from "@nestjs/common";
import { BackgroundTasks } from "../application/background-tasks.js";
import { Clock } from "../application/clock.js";
import { IdGenerator } from "../application/id-generator.js";
import { CryptoIdGenerator } from "./crypto-id-generator.js";
import { LoggingBackgroundTasks } from "./logging-background-tasks.js";
import { SystemClock } from "./system-clock.js";

/** Cross-cutting services every module may inject. */
@Global()
@Module({
  providers: [
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: CryptoIdGenerator },
    { provide: BackgroundTasks, useClass: LoggingBackgroundTasks },
  ],
  exports: [Clock, IdGenerator, BackgroundTasks],
})
export class SharedModule {}
