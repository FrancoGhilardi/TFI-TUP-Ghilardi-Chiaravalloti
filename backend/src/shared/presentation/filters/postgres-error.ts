// Node system errors (EPERM, EBUSY) also have 5 characters but never contain a digit.
const SQLSTATE_PATTERN = /^(?=.*\d)[0-9A-Z]{5}$/;
const MAX_CAUSE_DEPTH = 5;

/**
 * Finds the PostgreSQL SQLSTATE in an error or in its `cause` chain, since the driver
 * error may arrive wrapped by the ORM. Returns `undefined` if there is none.
 */
export function extractSqlState(error: unknown): string | undefined {
  const visited = new Set<unknown>();
  let current = error;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (typeof current !== "object" || current === null || visited.has(current)) {
      return undefined;
    }
    visited.add(current);

    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === "string" && SQLSTATE_PATTERN.test(code)) {
      return code;
    }
    current = cause;
  }

  return undefined;
}
