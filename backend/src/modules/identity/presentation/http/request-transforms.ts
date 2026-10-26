/** A space copied along with a value is not part of it; anything that is not text stays. */
export const trimString = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;
