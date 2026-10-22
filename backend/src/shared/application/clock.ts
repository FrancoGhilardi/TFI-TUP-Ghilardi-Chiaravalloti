/** Current time, injected so use cases do not read the system clock directly. */
export abstract class Clock {
  abstract now(): Date;
}
