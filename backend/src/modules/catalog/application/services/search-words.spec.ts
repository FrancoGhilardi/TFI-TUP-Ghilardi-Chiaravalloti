import { CatalogSettings } from "../settings/catalog-settings.js";
import { searchWordsOf, wordForms } from "./search-words.js";

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

describe("wordForms", () => {
  it("adds the singular of a plural, so it finds titles written either way", () => {
    expect(wordForms("cuadernos")).toEqual(["cuadernos", "cuaderno"]);
    expect(wordForms("Pinceles")).toEqual(["pinceles", "pincele", "pincel"]);
    expect(wordForms("lápices")).toEqual(["lápices", "lápiz"]);
  });

  it("adds the plural of a word ending in z, which the singular does not contain", () => {
    expect(wordForms("lapiz")).toEqual(["lapiz", "lapices"]);
    expect(wordForms("LÁPIZ")).toEqual(["lápiz", "lápices"]);
  });

  it("leaves alone a singular that its plural already contains", () => {
    expect(wordForms("cuaderno")).toEqual(["cuaderno"]);
    expect(wordForms("pincel")).toEqual(["pincel"]);
  });

  it("never cuts a word below three letters, which would match almost anything", () => {
    expect(wordForms("los")).toEqual(["los"]);
    expect(wordForms("tres")).toEqual(["tres", "tre"]);
    expect(wordForms("mes")).toEqual(["mes"]);
    expect(wordForms("luces")).toEqual(["luces", "luz"]);
  });
});
