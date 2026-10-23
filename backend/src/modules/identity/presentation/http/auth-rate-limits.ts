import type { RateLimit } from "../../../../shared/presentation/http/rate-limit.js";

/** Stricter limits per client IP for the endpoints exposed to brute force. */
export const LOGIN_RATE_LIMIT: RateLimit = { limit: 5, ttl: 60_000 };

/** Checking the current password would let a stolen access token guess it. */
export const CHANGE_PASSWORD_RATE_LIMIT: RateLimit = { limit: 5, ttl: 60_000 };

/** Also protects the daily quota of the mail provider. */
export const FORGOT_PASSWORD_RATE_LIMIT: RateLimit = { limit: 3, ttl: 15 * 60_000 };
