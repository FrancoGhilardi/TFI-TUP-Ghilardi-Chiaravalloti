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

  it("accepts up to 220 characters, the longest slug column", () => {
    expect(Slug.fromText("a".repeat(220)).length).toBe(220);
    expect(() => Slug.fromText("a".repeat(221))).toThrow(new InvalidSlugError("tooLong"));
    expect(() => Slug.fromValue("a".repeat(221))).toThrow(new InvalidSlugError("tooLong"));
    expect(() => Slug.fromText("a".repeat(219)).withSuffix(2)).toThrow(
      new InvalidSlugError("tooLong"),
    );
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
