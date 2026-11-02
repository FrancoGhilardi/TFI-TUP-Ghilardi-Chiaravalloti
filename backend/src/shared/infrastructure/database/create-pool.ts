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
