import { DomainError } from "./domain-error.js";

/** The caller is not allowed to perform the action. */
export abstract class ForbiddenActionError extends DomainError {}
