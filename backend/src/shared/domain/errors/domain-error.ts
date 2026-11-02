/**
 * Base of all domain errors. `code` is a stable identifier clients can rely on;
 * concrete errors define it, usually through one of the specialized bases.
 */
export abstract class DomainError extends Error {
  readonly code: string;

  protected constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}
