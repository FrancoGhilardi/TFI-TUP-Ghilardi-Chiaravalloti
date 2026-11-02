import { type ExecutionContext, SetMetadata } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";

export const IS_PUBLIC_KEY = "isPublic";

/** Lets a handler or a whole controller be called without an access token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Whether the handler or its controller is marked with `@Public()`. */
export function isPublic(reflector: Reflector, context: ExecutionContext): boolean {
  return (
    reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) === true
  );
}
