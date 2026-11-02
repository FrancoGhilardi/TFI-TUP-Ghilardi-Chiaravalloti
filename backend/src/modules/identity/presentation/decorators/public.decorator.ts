import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Lets a handler or a whole controller be called without an access token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
