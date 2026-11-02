const escaped = (text: string) => text.replace(/[\\%_]/g, (char) => `\\${char}`);

/** An `ILIKE` pattern that finds the text anywhere; its wildcards match themselves. */
export function containsPattern(text: string): string {
  return `%${escaped(text)}%`;
}

/** An `ILIKE` pattern that finds the text at the start; its wildcards match themselves. */
export function prefixPattern(text: string): string {
  return `${escaped(text)}%`;
}
