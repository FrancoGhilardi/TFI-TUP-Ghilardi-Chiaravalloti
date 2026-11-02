import { InvalidSlugError } from "../errors/invalid-slug-error.js";

const FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// What is left of an accented letter once split: á becomes a and an accent, ñ becomes n and a tilde.
const COMBINING_MARKS = /\p{M}/gu;
// Letters that no Unicode decomposition turns into plain ones.
const LETTERS: Record<string, string> = {
  ß: "ss",
  ø: "o",
  æ: "ae",
  œ: "oe",
  ł: "l",
  đ: "d",
  ð: "d",
  þ: "th",
};
const SPECIAL_LETTERS = new RegExp(`[${Object.keys(LETTERS).join("")}]`, "g");

/**
 * The readable part of a URL that names a product or a category: lowercase letters and digits
 * joined by single hyphens, as the database checks it, within the longest slug column.
 */
export class Slug {
  static readonly MAX_LENGTH = 220;

  private constructor(private readonly value: string) {}

  /** "Cuaderno Rayado A4 (ñandú)" becomes "cuaderno-rayado-a4-nandu". */
  static fromText(text: string): Slug {
    const value = text
      .normalize("NFD")
      .replace(COMBINING_MARKS, "")
      .toLowerCase()
      .replace(SPECIAL_LETTERS, (letter) => LETTERS[letter] ?? letter)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!value) {
      throw new InvalidSlugError("empty");
    }
    return Slug.within(value);
  }

  /** A slug already in the right format, such as one stored before. */
  static fromValue(value: string): Slug {
    if (!FORMAT.test(value)) {
      throw new InvalidSlugError("format");
    }
    return Slug.within(value);
  }

  private static within(value: string): Slug {
    if (value.length > Slug.MAX_LENGTH) {
      throw new InvalidSlugError("tooLong");
    }
    return new Slug(value);
  }

  get length(): number {
    return this.value.length;
  }

  /** The next candidate when the slug is taken: "cuaderno-2", "cuaderno-3". */
  withSuffix(n: number): Slug {
    if (!Number.isInteger(n) || n < 2) {
      throw new RangeError("A slug suffix starts at 2");
    }
    return Slug.within(`${this.value}-${n}`);
  }

  equals(other: Slug): boolean {
    return other.value === this.value;
  }

  toString(): string {
    return this.value;
  }
}
