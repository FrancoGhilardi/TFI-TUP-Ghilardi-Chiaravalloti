import { ApiError } from "@/modules/core/http";

import { blockedByText } from "../content/categories";

/** How many things block the action, when the API says so (`details: { count }`). */
export function blockedCount(error: unknown): number | undefined {
  if (!(error instanceof ApiError) || !error.details || Array.isArray(error.details)) {
    return undefined;
  }
  const { count } = error.details;
  return typeof count === "number" ? count : undefined;
}

/** What to tell when the API refuses an action: its reason and, if it has it, how many block it. */
export function refusalMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }
  const count = blockedCount(error);
  if (count === undefined) {
    return error.message;
  }
  return `${error.message} ${count === 1 ? blockedByText.one : blockedByText.many(count)}`;
}
