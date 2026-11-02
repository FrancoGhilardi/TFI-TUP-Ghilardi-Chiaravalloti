import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import type { Env } from "../../config/env.js";
import { BackgroundTasks } from "../application/background-tasks.js";
import { Clock } from "../application/clock.js";
import { EventPublisher } from "../application/event-publisher.js";
import { FileStorage } from "../application/file-storage.js";
import { IdGenerator } from "../application/id-generator.js";
import { CryptoIdGenerator } from "./crypto-id-generator.js";
import { NestEventPublisher } from "./events/nest-event-publisher.js";
import { LoggingBackgroundTasks } from "./logging-background-tasks.js";
import { createStorageClient, SupabaseFileStorage } from "./storage/supabase-file-storage.js";
import { SystemClock } from "./system-clock.js";

/** Cross-cutting services every module may inject. */
@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    { provide: Clock, useClass: SystemClock },
    { provide: IdGenerator, useClass: CryptoIdGenerator },
    { provide: BackgroundTasks, useClass: LoggingBackgroundTasks },
    { provide: EventPublisher, useClass: NestEventPublisher },
    {
      provide: FileStorage,
      useFactory: (config: ConfigService<Env, true>) =>
        new SupabaseFileStorage(
          createStorageClient(
            config.get("SUPABASE_URL", { infer: true }),
            config.get("SUPABASE_SERVICE_ROLE_KEY", { infer: true }),
          ),
        ),
      inject: [ConfigService],
    },
  ],
  exports: [Clock, IdGenerator, BackgroundTasks, EventPublisher, FileStorage],
})
export class SharedModule {}
