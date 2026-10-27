/**
 * Whether something that ends at `endsAt`, such as a sale or a "new" mark, still runs at
 * `now`: without an end it runs until removed, and it stops right at its end.
 */
export function runsAt(endsAt: Date | undefined, now: Date): boolean {
  return endsAt === undefined || now.getTime() < endsAt.getTime();
}
