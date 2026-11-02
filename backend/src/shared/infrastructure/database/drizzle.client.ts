import { Injectable, Logger, type OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import type { Env } from "../../../config/env.js";
import { createPool } from "./create-pool.js";
import * as schema from "./schema/index.js";

export type Schema = typeof schema;
export type Database = NodePgDatabase<Schema>;

@Injectable()
export class DrizzleClient implements OnApplicationShutdown {
  private readonly logger = new Logger(DrizzleClient.name);
  readonly pool: Pool;
  readonly db: Database;

  constructor(config: ConfigService<Env, true>) {
    this.pool = createPool({
      url: config.get("DATABASE_URL", { infer: true }),
      sslMode: config.get("DATABASE_SSL_MODE", { infer: true }),
      sslCa: config.get("DATABASE_SSL_CA", { infer: true }),
      max: config.get("DATABASE_POOL_MAX", { infer: true }),
      onIdleError: (error) => this.logger.error(`Idle database client error: ${error.message}`),
    });
    this.db = drizzle({ client: this.pool, schema });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
