// Deep enough for any real chain; it only stops a pathological one from growing without end.
const MAX_DEPTH = 10;

/**
 * The stack of an error followed by what caused it, for the logs: each cause in turn, each
 * error grouped in an `AggregateError`, and a thrown value that is not an error as text.
 */
export function stackWithCauses(error: Error): string {
  return describe(error, new Set(), 0);
}

function describe(error: Error, seen: Set<unknown>, depth: number): string {
  seen.add(error);
  const parts = [error.stack ?? error.message];
  if (error instanceof AggregateError) {
    for (const inner of error.errors as unknown[]) {
      parts.push(`Including: ${follow(inner, seen, depth)}`);
    }
  }
  if (error.cause !== undefined) {
    parts.push(`Caused by: ${follow(error.cause, seen, depth)}`);
  }
  return parts.join("\n");
}

function follow(value: unknown, seen: Set<unknown>, depth: number): string {
  if (seen.has(value)) {
    return "[the same error again]";
  }
  if (depth >= MAX_DEPTH) {
    return "[more causes left out]";
  }
  return value instanceof Error ? describe(value, seen, depth + 1) : asText(value);
}

function asText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
