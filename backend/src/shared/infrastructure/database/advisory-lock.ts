import { sql } from "drizzle-orm";
import type { DrizzleExecutor } from "./drizzle.executor.js";

/**
 * Each kind of lock has its own key space, so a hash shared by keys of different kinds never
 * makes them wait for each other. The two-number keys used here never meet the single-number
 * one of the last admin trigger either.
 */
export const LockSpace = {
  CATEGORY_HIERARCHY: 1,
  CATEGORY_SLUG: 2,
  PRODUCT_SLUG: 3,
} as const;

export type LockSpace = (typeof LockSpace)[keyof typeof LockSpace];

/**
 * Takes a transaction advisory lock on `key` within `space`, released by the commit or the
 * rollback. Two keys of one space may share a hash and wait for each other, which is rare.
 */
export async function lockForTransaction(
  executor: DrizzleExecutor,
  space: LockSpace,
  key: string,
): Promise<void> {
  if (!executor.hasActiveTransaction()) {
    throw new Error(`The lock on ${key} needs an active transaction`);
  }
  await executor
    .current()
    .execute(sql`SELECT pg_advisory_xact_lock(${space}::int, hashtext(${key}))`);
}
