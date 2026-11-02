import type { CatalogSettings } from "../settings/catalog-settings.js";

/** What a store search looks for: its words, and them as one text. */
export interface SearchWords {
  /** Each once, whatever its case and accents; empty when no word is long enough. */
  words: string[];
  /**
   * The words looked for, in order, with a single space between them: what a title or name
   * starting with the search starts with, so a one-letter or repeated word never stops it.
   */
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
  const byKey = new Map<string, string>();
  for (const word of text.split(/\s+/).filter((typed) => typed !== "")) {
    const key = keyOf(word);
    if ([...key].length >= settings.searchMinWordLength && !byKey.has(key)) {
      byKey.set(key, word);
    }
  }
  const words = [...byKey.values()].slice(0, settings.searchMaxWords);
  return { words, text: words.join(" ") };
}
