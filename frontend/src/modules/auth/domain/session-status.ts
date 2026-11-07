/**
 * Where the panel's session is. `unavailable`: it could not be restored for a reason that says
 * nothing about it. `signedOut`: the person closed it on purpose.
 */
export type SessionStatus = "loading" | "authenticated" | "anonymous" | "unavailable" | "signedOut";
