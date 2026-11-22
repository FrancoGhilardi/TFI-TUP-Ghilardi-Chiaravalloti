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

const BLOCKERS: Record<string, (count: number) => string> = {
  CATEGORY_IN_USE: blockedByText.products,
  CATEGORY_HAS_ACTIVE_CHILDREN: blockedByText.children,
};

/** What to tell when the API refuses an action: its reason and, if it has it, how many block it. */
export function refusalMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return fallback;
  }
  const count = blockedCount(error);
  if (count === undefined) {
    return error.message;
  }
  const blockers = BLOCKERS[error.code] ?? blockedByText.other;
  return `${error.message} ${blockers(count)}`;
}
