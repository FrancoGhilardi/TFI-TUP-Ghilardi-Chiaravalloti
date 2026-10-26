const UNIQUE_VIOLATION = "23505";
const MAX_CAUSE_DEPTH = 5;

/**
 * Whether the error, or one of its causes (the ORM wraps the driver error), is a violation of
 * that unique constraint, so a repository can report it as the domain conflict it means.
 */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
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
    if (code === UNIQUE_VIOLATION && name === constraint) {
      return true;
    }
    current = cause;
  }
  return false;
}
