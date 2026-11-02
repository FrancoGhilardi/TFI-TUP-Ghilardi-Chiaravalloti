import { CatalogSettings } from "../settings/catalog-settings.js";
import { searchWordsOf } from "./search-words.js";

const settings = new CatalogSettings();

describe("searchWordsOf", () => {
  it("keeps each word once, whatever its case and accents, and the text of only those", () => {
    expect(searchWordsOf("  Lápiz  LAPIZ\tnegro ", settings)).toEqual({
      words: ["Lápiz", "negro"],
      text: "Lápiz negro",
    });
    expect(searchWordsOf("a lapiz negro", settings).text).toBe("lapiz negro");
  });

  it("leaves out one-letter words, accents aside, and keeps the first 5", () => {
    expect(searchWordsOf("a é cuaderno uno dos tres cuatro cinco", settings).words).toEqual([
      "cuaderno",
      "uno",
      "dos",
      "tres",
      "cuatro",
    ]);
  });

  it("finds no word in a text of one-letter words", () => {
    expect(searchWordsOf("a b", settings)).toEqual({ words: [], text: "" });
  });
});
