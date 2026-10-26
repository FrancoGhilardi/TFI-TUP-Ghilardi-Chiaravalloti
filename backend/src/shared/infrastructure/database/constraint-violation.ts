const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const MAX_CAUSE_DEPTH = 5;

/**
 * Whether the error, or one of its causes (the ORM wraps the driver error), is a violation of
 * that unique constraint, so a repository can report it as the domain conflict it means.
 */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  return violates(error, UNIQUE_VIOLATION, constraint);
}

/** Same as `isUniqueViolation`, for a check constraint or a trigger that names one. */
export function isCheckViolation(error: unknown, constraint: string): boolean {
  return violates(error, CHECK_VIOLATION, constraint);
}

function violates(error: unknown, sqlState: string, constraint: string): boolean {
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (typeof current !== "object" || current === null) {
      return false;
    }
    const {
      code,
      constraint: name,
      cause,
    } = current as {
      code?: unknown;
      constraint?: unknown;
      cause?: unknown;
    };
    if (code === sqlState && name === constraint) {
      return true;
    }
    current = cause;
  }
  return false;
}
