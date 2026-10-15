import { DomainError } from "./domain-error.js";

/** The operation breaks a business rule. */
export abstract class BusinessRuleViolationError extends DomainError {}
