/** An `ILIKE` pattern that finds the text anywhere; its wildcards match themselves. */
export function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
