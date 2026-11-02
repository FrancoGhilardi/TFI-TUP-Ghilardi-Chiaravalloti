import { InvalidValueError } from "../../../../shared/domain/errors/index.js";

export type InvalidCategoryAssignmentReason =
  "empty" | "duplicated" | "primaryMissing" | "severalPrimary";

const MESSAGES: Record<InvalidCategoryAssignmentReason, string> = {
  empty: "El producto tiene que tener al menos una categoría.",
  duplicated: "Las categorías del producto no pueden repetirse.",
  primaryMissing: "La categoría principal tiene que estar entre las categorías del producto.",
  severalPrimary: "El producto tiene que tener una sola categoría principal.",
};

/** Same code for every reason, with a message for each. */
export class InvalidCategoryAssignmentError extends InvalidValueError {
  constructor(readonly reason: InvalidCategoryAssignmentReason) {
    super("INVALID_CATEGORY_ASSIGNMENT", MESSAGES[reason]);
  }
}
