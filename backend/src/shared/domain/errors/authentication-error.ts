import { DomainError } from "./domain-error.js";

/** The caller could not be authenticated. */
export abstract class AuthenticationError extends DomainError {}
