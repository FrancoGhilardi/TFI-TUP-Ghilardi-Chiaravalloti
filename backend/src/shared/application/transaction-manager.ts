/** Runs a unit of work atomically: commits if it resolves, rolls back if it rejects. */
export abstract class TransactionManager {
  abstract run<T>(work: () => Promise<T>): Promise<T>;
}
