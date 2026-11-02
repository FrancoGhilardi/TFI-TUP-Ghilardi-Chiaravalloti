import type { Sku } from "../../domain/value-objects/sku.js";

/** The next free SKU of a new product; never the same twice. */
export abstract class SkuGenerator {
  abstract next(): Promise<Sku>;
}
