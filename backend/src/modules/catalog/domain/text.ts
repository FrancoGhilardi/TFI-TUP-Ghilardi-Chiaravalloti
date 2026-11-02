import { SORT_ORDER_MAX } from "./catalog-limits.js";
import { InvalidDescriptionError } from "./errors/invalid-description-error.js";
import { InvalidSortOrderError } from "./errors/invalid-sort-order-error.js";

// Counted in code points, like the length of a Postgres varchar.
const lengthOf = (text: string) => [...text].length;

/** Trimmed text that must not be blank nor longer than `maxLength`. */
export function requiredText(value: string, maxLength: number, error: () => Error): string {
  const trimmed = value.trim();
  const length = lengthOf(trimmed);
  if (length === 0 || length > maxLength) {
    throw error();
  }
  return trimmed;
}

/** Trimmed optional description; blank means none. */
export function optionalDescription(value: string | undefined, maxLength: number) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (lengthOf(trimmed) > maxLength) {
    throw new InvalidDescriptionError(maxLength);
  }
  return trimmed;
}

/** Position in a listing: a whole number from 0 that fits the integer column. */
export function sortOrder(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > SORT_ORDER_MAX) {
    throw new InvalidSortOrderError();
  }
  return value;
}
