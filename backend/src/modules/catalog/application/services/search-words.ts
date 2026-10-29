import type { CatalogSettings } from "../settings/catalog-settings.js";

/** What a store search looks for: its words and the whole text. */
export interface SearchWords {
  /** Each once, whatever its case and accents; empty when no word is long enough. */
  words: string[];
  /** The words as typed, with a single space between them. */
  text: string;
}

// The same word whatever its case and accents, as the queries compare it.
const keyOf = (word: string) => word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * The words a store search looks for. Each costs a pass over the titles, so one-letter words,
 * which match almost everything, are left out, and only the first few distinct ones are kept.
 */
export function searchWordsOf(
  text: string,
  settings: Pick<CatalogSettings, "searchMinWordLength" | "searchMaxWords">,
): SearchWords {
  const all = text.split(/\s+/).filter((word) => word !== "");
  const byKey = new Map<string, string>();
  for (const word of all) {
    const key = keyOf(word);
    if ([...key].length >= settings.searchMinWordLength && !byKey.has(key)) {
      byKey.set(key, word);
    }
  }
  return {
    words: [...byKey.values()].slice(0, settings.searchMaxWords),
    // A single space between words, so a doubled one does not stop a match at the start.
    text: all.join(" "),
  };
}
