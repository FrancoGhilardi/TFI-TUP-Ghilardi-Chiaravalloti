import { InvalidValueError } from "../../../../shared/domain/errors/index.js";
import { RELATED_PRODUCTS_MAX } from "../catalog-limits.js";

export type InvalidRelatedProductsReason = "duplicated" | "tooMany";

/** Also what the request validation answers, so both say the same. */
export const RELATED_PRODUCTS_MESSAGES: Record<InvalidRelatedProductsReason, string> = {
  duplicated: "Los productos similares no pueden repetirse.",
  tooMany: `Elegí hasta ${RELATED_PRODUCTS_MAX} productos similares.`,
};

/** Same code for every reason, with a message for each. */
export class InvalidRelatedProductsError extends InvalidValueError {
  constructor(readonly reason: InvalidRelatedProductsReason) {
    super("INVALID_RELATED_PRODUCTS", RELATED_PRODUCTS_MESSAGES[reason]);
  }
}
