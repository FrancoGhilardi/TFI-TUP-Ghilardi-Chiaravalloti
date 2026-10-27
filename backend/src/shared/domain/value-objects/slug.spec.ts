import { InvalidSlugError } from "../errors/invalid-slug-error.js";
import { InvalidValueError } from "../errors/invalid-value-error.js";
import { Slug } from "./slug.js";

describe("Slug", () => {
  it.each([
    ["Cuaderno Rayado A4", "cuaderno-rayado-a4"],
    ["Lápiz Negro N° 2", "lapiz-negro-n-2"],
    ["Ñandú y CAÑA", "nandu-y-cana"],
    ["  --Hola,   mundo!--  ", "hola-mundo"],
    ["Ü ö é à", "u-o-e-a"],
    ["100% algodón", "100-algodon"],
    ["Straße", "strasse"],
    ["Łódź", "lodz"],
    ["Søren Æble Œuvre", "soren-aeble-oeuvre"],
    ["Đorđe þing", "dorde-thing"],
  ])("turns %o into %o", (text, slug) => {
    expect(Slug.fromText(text).toString()).toBe(slug);
  });

  it.each(["", "   ", "¡¡!!", "---", "日本"])("refuses %o, which leaves nothing", (text) => {
    expect(() => Slug.fromText(text)).toThrow(new InvalidSlugError("empty"));
  });

  it("accepts a stored value in the database format", () => {
    expect(Slug.fromValue("cuaderno-a4-2").toString()).toBe("cuaderno-a4-2");
  });

  it.each(["Cuaderno", "cuaderno--a4", "-cuaderno", "cuaderno-", "cuaderno a4", "", "lápiz"])(
    "rejects the stored value %o",
    (value) => {
      expect(() => Slug.fromValue(value)).toThrow(new InvalidSlugError("format"));
    },
  );

  it("adds a numeric suffix, starting at 2", () => {
    const slug = Slug.fromText("Cuaderno");

    expect(slug.withSuffix(2).toString()).toBe("cuaderno-2");
    expect(slug.withSuffix(15).toString()).toBe("cuaderno-15");
    expect(() => slug.withSuffix(1)).toThrow(RangeError);
    expect(() => slug.withSuffix(2.5)).toThrow(RangeError);
  });

  it("compares by value", () => {
    expect(Slug.fromText("A b").equals(Slug.fromValue("a-b"))).toBe(true);
  });

  describe("length", () => {
    it("keeps up to 220 characters, the longest slug column, and refuses a longer stored one", () => {
      expect(Slug.fromText("a".repeat(220)).length).toBe(220);
      expect(() => Slug.fromValue("a".repeat(221))).toThrow(new InvalidSlugError("tooLong"));
    });

    it("cuts a longer text after the last whole word that fits", () => {
      const slug = Slug.fromText(`${"a".repeat(215)} bbbbbbbbbb`);

      expect(slug.toString()).toBe("a".repeat(215));
    });

    it("keeps the last word when the cut falls right before a hyphen", () => {
      expect(Slug.fromText("cuaderno rayado", 8).toString()).toBe("cuaderno");
      expect(Slug.fromText("cuaderno rayado", 9).toString()).toBe("cuaderno");
    });

    it("cuts right at the limit when the first word alone is longer", () => {
      expect(Slug.fromText("a".repeat(300)).toString()).toBe("a".repeat(220));
      expect(Slug.fromText("abcdefghij klm", 5).toString()).toBe("abcde");
    });

    it("cuts right at the limit when the whole words would leave less than half", () => {
      expect(Slug.fromText(`El ${"b".repeat(300)}`).toString()).toBe(`el-${"b".repeat(217)}`);
      expect(Slug.fromText("ab cdefghij", 8).toString()).toBe("ab-cdefg");
    });

    it("cuts letters that grow, such as ß, that a valid title may have", () => {
      const slug = Slug.fromText("ß".repeat(200));

      expect(slug.toString()).toBe("s".repeat(220));
    });

    it("takes a shorter limit, as categories do", () => {
      expect(Slug.fromText(`${"a".repeat(100)} ${"b".repeat(30)}`, 120).toString()).toBe(
        "a".repeat(100),
      );
    });

    it("makes room for the suffix, cutting the slug like the text", () => {
      const long = Slug.fromText(`${"a".repeat(200)} ${"b".repeat(19)}`);

      expect(long.length).toBe(220);
      expect(long.withSuffix(2).toString()).toBe(`${"a".repeat(200)}-2`);
      expect(Slug.fromText("a".repeat(220)).withSuffix(12).toString()).toBe(
        `${"a".repeat(217)}-12`,
      );
      expect(Slug.fromText("cuaderno-rayado").withSuffix(2, 12).toString()).toBe("cuaderno-2");
    });
  });

  it.each([
    ["empty", "El texto tiene que incluir al menos una letra o un número."],
    ["tooLong", "El texto es demasiado largo para formar la dirección."],
    ["format", "La dirección solo puede tener letras minúsculas y números separados por guiones."],
  ] as const)("fails as an invalid value with a message for %s", (reason, message) => {
    const error = new InvalidSlugError(reason);

    expect(error).toBeInstanceOf(InvalidValueError);
    expect(error).toMatchObject({ code: "INVALID_SLUG", message, reason });
  });
});
