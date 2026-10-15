import { DomainError } from "./domain-error.js";

/** The operation conflicts with existing data. */
export abstract class ConflictError extends DomainError {}
