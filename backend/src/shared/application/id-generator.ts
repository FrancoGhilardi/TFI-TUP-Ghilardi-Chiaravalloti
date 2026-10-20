/** Generates the identifier of a new entity before it is stored. */
export abstract class IdGenerator {
  abstract next(): string;
}
