import { type ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard, type ThrottlerLimitDetail } from "@nestjs/throttler";
import type { Response } from "express";

/**
 * Throttler guard that always sends the standard Retry-After header. The library only
 * sends it unsuffixed for the default throttler (Retry-After-strict for the strict one),
 * and clients only understand the standard name.
 */
@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader("Retry-After", String(throttlerLimitDetail.timeToBlockExpire));
    return super.throwThrottlingException(context, throttlerLimitDetail);
  }
}
