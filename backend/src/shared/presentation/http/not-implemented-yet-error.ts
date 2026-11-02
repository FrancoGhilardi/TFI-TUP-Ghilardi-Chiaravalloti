import { DomainError } from "../../domain/errors/index.js";

/** The route exists, but its behavior has not been built yet. */
export class NotImplementedYetError extends DomainError {
  constructor() {
    super("NOT_IMPLEMENTED", "Esta función todavía no está disponible.");
  }
}
