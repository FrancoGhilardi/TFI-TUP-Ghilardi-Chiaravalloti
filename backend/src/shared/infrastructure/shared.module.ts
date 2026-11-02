import { Global, Module } from "@nestjs/common";
import { Clock } from "../application/clock.js";
import { IdGenerator } from "../application/id-generator.js";
import { CryptoIdGenerator } from "./crypto-id-generator.js";
import { SystemClock } from "./system-clock.js";

/** Cross-cutting services every module may inject. */
@Global()
@Module({
  providers: [
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: CryptoIdGenerator },
  ],
  exports: [Clock, IdGenerator],
})
export class SharedModule {}
