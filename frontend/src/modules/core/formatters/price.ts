/** A price as the API sends it: decimal text with up to two decimals, such as `"1500.50"`. */
export const DECIMAL_PRICE = /^\d+(\.\d{1,2})?$/;

const wholePesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const withCents = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

/**
 * Formats an API price (decimal text such as `"1500.50"`) as `$ 1.500,50`, or `$ 24.900` when whole.
 * Responses are validated before they reach the UI, so anything else is a bug and throws rather
 * than showing `$ NaN` to a customer.
 */
export function formatPrice(decimal: string): string {
  if (!DECIMAL_PRICE.test(decimal)) {
    throw new TypeError(`Invalid price "${decimal}"`);
  }
  const amount = Number(decimal);
  return Number.isInteger(amount) ? wholePesos.format(amount) : withCents.format(amount);
}
