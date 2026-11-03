const MAX_DESCRIPTION_LENGTH = 160;

/**
 * Text for a meta description: whitespace collapsed and cut at a word boundary, with an ellipsis,
 * when it is longer than search engines show. It counts and cuts by characters, so an emoji is
 * never left in half.
 */
export function summarize(text: string, maxLength = MAX_DESCRIPTION_LENGTH): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const characters = Array.from(flat);
  if (characters.length <= maxLength) {
    return flat;
  }
  const cut = characters.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  const kept = lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut;
  return `${kept.join("").replace(/[\s.,;:]+$/, "")}…`;
}
