import { DomainError } from "./domain-error.js";

/** A value does not have the expected format or range. */
export abstract class InvalidValueError extends DomainError {}
