/** Generates the random temporary passwords sent by mail. */
export abstract class TemporaryPasswordGenerator {
  abstract generate(): string;
}
