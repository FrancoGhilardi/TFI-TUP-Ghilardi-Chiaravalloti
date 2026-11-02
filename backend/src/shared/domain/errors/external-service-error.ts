import { DomainError } from "./domain-error.js";

/**
 * A service the operation depends on, such as the mail provider, failed or did not answer.
 * Unlike the other bases it is a real failure, so it is logged along with its cause.
 */
export abstract class ExternalServiceError extends DomainError {}
