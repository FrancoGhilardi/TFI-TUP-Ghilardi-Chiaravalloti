import { DomainError } from "../domain/errors/domain-error.js";

// Deep enough for any real chain; it only stops a pathological one from growing without end.
const MAX_DEPTH = 10;

/**
 * The stack of an error followed by what caused it, for the logs: each cause in turn, each
 * error grouped in an `AggregateError`, and a thrown value that is not an error as text. A
 * domain error is named by class and code, since its message is the Spanish text for users.
 */
export function stackWithCauses(thrown: unknown): string {
  return thrown instanceof Error ? describe(thrown, new Set(), 0) : asText(thrown);
}

function describe(error: Error, seen: Set<unknown>, depth: number): string {
  seen.add(error);
  const parts = [headerOf(error)];
  const grouped = error instanceof AggregateError ? (error.errors as unknown[]) : [];
  for (const inner of grouped) {
    parts.push(`Including: ${follow(inner, seen, depth)}`);
  }
  // A cause that is one of the grouped errors was already written above.
  if (error.cause != null && !grouped.includes(error.cause)) {
    parts.push(`Caused by: ${follow(error.cause, seen, depth)}`);
  }
  return parts.join("\n");
}

function headerOf(error: Error): string {
  const stack = error.stack ?? `${error.name}: ${error.message}`;
  if (!(error instanceof DomainError)) {
    return stack;
  }
  const userText = `${error.name}: ${error.message}`;
  const header = `${error.name} ${error.code}`;
  if (stack.startsWith(userText)) {
    return header + stack.slice(userText.length);
  }
  // A stack formatted some other way still keeps its frames; only its first line goes.
  const firstBreak = stack.indexOf("\n");
  return firstBreak === -1 ? header : header + stack.slice(firstBreak);
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
