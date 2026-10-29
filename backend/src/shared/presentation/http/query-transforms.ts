/** "true" and "false" from the query string; anything else stays as sent, to be refused. */
export const queryBoolean = ({ value }: { value: unknown }): unknown =>
  value === "true" ? true : value === "false" ? false : value;

/** A text from the query string, trimmed; a blank one filters nothing, as if it were not sent. */
export const queryText = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() || undefined : value;

/**
 * A whole number from the query string; a blank one filters nothing, as if it were not sent,
 * and any other text stays as sent, to be refused.
 */
export const queryInteger = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== "string") {
    return value;
  }
  return value.trim() === "" ? undefined : Number(value);
};
