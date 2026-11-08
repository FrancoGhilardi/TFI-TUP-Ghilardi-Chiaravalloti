/** Most digits before the decimal point that fit the API's `numeric(12,2)`. */
const MAX_INTEGER_DIGITS = 12;
const PRICE = /^(\d+)(?:[.,](\d{1,2}))?$/;

export type PriceInput =
  | { ok: true; value: string; cents: number }
  | { ok: false; reason: "empty" | "format" | "zero" | "range" };

/**
 * Reads a price as it is typed (`1500`, `1500,5`, `1500.50`) into the decimal text the API wants
 * (`"1500.50"`). Thousand separators are not accepted: `1.500` could mean one and a half.
 */
export function parsePriceInput(text: string): PriceInput {
  const typed = text.trim();
  if (typed === "") {
    return { ok: false, reason: "empty" };
  }
  const match = PRICE.exec(typed);
  if (!match) {
    return { ok: false, reason: "format" };
  }
  const integer = match[1].replace(/^0+(?=\d)/, "");
  const decimals = (match[2] ?? "").padEnd(2, "0");
  if (integer.length > MAX_INTEGER_DIGITS) {
    return { ok: false, reason: "range" };
  }
  const cents = Number(integer) * 100 + Number(decimals);
  if (cents === 0) {
    return { ok: false, reason: "zero" };
  }
  return { ok: true, value: `${integer}.${decimals}`, cents };
}

/** How much cheaper the offer is, in whole percent, or `undefined` if either price is not valid. */
export function discountPercent(price: string, salePrice: string): number | undefined {
  const regular = parsePriceInput(price);
  const offer = parsePriceInput(salePrice);
  if (!regular.ok || !offer.ok || offer.cents >= regular.cents) {
    return undefined;
  }
  return Math.round((1 - offer.cents / regular.cents) * 100);
}

/** A price from the API as the field shows it: `"1500.00"` → `1500`, `"1500.50"` → `1500,50`. */
export function priceToInput(decimal: string): string {
  const [integer, decimals] = decimal.split(".");
  return decimals && decimals !== "00" ? `${integer},${decimals}` : integer;
}
