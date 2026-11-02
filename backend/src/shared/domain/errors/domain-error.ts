/** Facts a client can show along with the message, such as how many records block an action. */
export type ErrorDetails = Readonly<Record<string, string | number | boolean>>;

export interface DomainErrorOptions extends ErrorOptions {
  /** Sent to the client as is, so it never holds anything internal. */
  details?: ErrorDetails;
}

/**
 * Base of all domain errors. `code` is a stable identifier clients can rely on;
 * concrete errors define it, usually through one of the specialized bases.
 */
export abstract class DomainError extends Error {
  readonly code: string;
  readonly publicDetails?: ErrorDetails;

  protected constructor(code: string, message: string, options?: DomainErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
    this.publicDetails = options?.details;
  }
}
