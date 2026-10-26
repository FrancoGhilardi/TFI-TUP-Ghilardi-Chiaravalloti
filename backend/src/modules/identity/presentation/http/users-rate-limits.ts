import type { RateLimit } from "../../../../shared/presentation/http/rate-limit.js";

/** Every reset sends a mail: protects the daily quota of the provider from a script. */
export const RESET_PASSWORD_RATE_LIMIT: RateLimit = { limit: 10, ttl: 15 * 60_000 };
