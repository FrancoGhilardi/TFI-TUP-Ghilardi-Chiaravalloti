import { DomainError } from "./domain-error.js";

/** The requested resource does not exist. */
export abstract class EntityNotFoundError extends DomainError {}
