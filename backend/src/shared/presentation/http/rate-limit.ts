import { applyDecorators, type ExecutionContext, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Throttle, type ThrottlerModuleOptions } from "@nestjs/throttler";

export interface RateLimit {
  limit: number;
  ttl: number;
}

const STRICT_THROTTLER = "strict";
const STRICT_RATE_LIMIT_KEY = "strictRateLimit";
const reflector = new Reflector();

export const GENERAL_RATE_LIMIT: RateLimit = { limit: 100, ttl: 60_000 };

/**
 * Adds a stricter limit to a route or a whole controller, counted per route and client IP.
 * It applies on top of the general limit, which the route keeps consuming.
 */
export const StrictRateLimit = (rateLimit: RateLimit) =>
  applyDecorators(
    SetMetadata(STRICT_RATE_LIMIT_KEY, true),
    Throttle({ [STRICT_THROTTLER]: rateLimit }),
  );

const hasStrictRateLimit = (context: ExecutionContext) =>
  reflector.getAllAndOverride<boolean | undefined>(STRICT_RATE_LIMIT_KEY, [
    context.getHandler(),
    context.getClass(),
  ]) === true;

export const RATE_LIMIT_OPTIONS: ThrottlerModuleOptions = {
  throttlers: [
    {
      name: "default",
      ...GENERAL_RATE_LIMIT,
      // The tracker alone is the key, so every route shares one counter per client IP.
      generateKey: (_context, tracker) => tracker,
    },
    {
      name: STRICT_THROTTLER,
      // Never used: every route this throttler applies to sets its own limit.
      ...GENERAL_RATE_LIMIT,
      skipIf: (context) => !hasStrictRateLimit(context),
    },
  ],
  errorMessage: "Hiciste demasiados intentos. Esperá un momento y volvé a intentar.",
};
