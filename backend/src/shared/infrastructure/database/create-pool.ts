import type { ConnectionOptions } from "node:tls";
import { Pool } from "pg";
import type { SslMode } from "../../../config/database-env.js";

export interface DatabaseConnectionOptions {
  url: string;
  sslMode: SslMode;
  sslCa?: string;
  max?: number;
  onIdleError?: (error: Error) => void;
}

/** Maps the configured SSL mode to the `pg` option; only `verify-full` validates the certificate. */
export function toSslConfig(mode: SslMode, ca?: string): ConnectionOptions | false {
  switch (mode) {
    case "disable":
      return false;
    case "require":
      return { rejectUnauthorized: false };
    case "verify-full":
      return { ca, rejectUnauthorized: true };
  }
}

/** Single entry point to open a pool, so every consumer gets the same SSL and timeout settings. */
export function createPool(options: DatabaseConnectionOptions): Pool {
  const pool = new Pool({
    connectionString: options.url,
    max: options.max ?? 10,
    ssl: toSslConfig(options.sslMode, options.sslCa),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
  // The pooler may drop idle connections; without a listener the process would crash.
  pool.on(
    "error",
    options.onIdleError ??
      ((error) => console.error(`Idle database client error: ${error.message}`)),
  );
  return pool;
}
