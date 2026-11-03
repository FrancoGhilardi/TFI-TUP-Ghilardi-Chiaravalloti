/** From this many units down, the page says the product is about to run out. */
export const LOW_STOCK_THRESHOLD = 6;

export type StockStatus =
  { kind: "out" } | { kind: "low"; units: number } | { kind: "in"; units: number };

export function stockStatus(stock: number): StockStatus {
  if (stock <= 0) {
    return { kind: "out" };
  }
  return stock <= LOW_STOCK_THRESHOLD
    ? { kind: "low", units: stock }
    : { kind: "in", units: stock };
}
