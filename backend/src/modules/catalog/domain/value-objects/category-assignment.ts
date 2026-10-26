import { InvalidCategoryAssignmentError } from "../errors/invalid-category-assignment-error.js";

/** A category given to a product; exactly one of a product's categories is its primary one. */
export class CategoryAssignment {
  private constructor(
    readonly categoryId: string,
    readonly isPrimary: boolean,
  ) {}

  /** At least one category, none repeated, and the primary one among them. */
  static fromIds(categoryIds: string[], primaryCategoryId: string): CategoryAssignment[] {
    if (categoryIds.length > 0 && !categoryIds.includes(primaryCategoryId)) {
      throw new InvalidCategoryAssignmentError("primaryMissing");
    }
    return CategoryAssignment.checked(
      categoryIds.map((id) => new CategoryAssignment(id, id === primaryCategoryId)),
    );
  }

  /**
   * The rule for a product's whole list, however it was put together: at least one
   * category, none repeated, exactly one primary.
   */
  static checked(assignments: CategoryAssignment[]): CategoryAssignment[] {
    if (assignments.length === 0) {
      throw new InvalidCategoryAssignmentError("empty");
    }
    const ids = assignments.map((assignment) => assignment.categoryId);
    if (new Set(ids).size !== ids.length) {
      throw new InvalidCategoryAssignmentError("duplicated");
    }
    const primaries = assignments.filter((assignment) => assignment.isPrimary).length;
    if (primaries === 0) {
      throw new InvalidCategoryAssignmentError("primaryMissing");
    }
    if (primaries > 1) {
      throw new InvalidCategoryAssignmentError("severalPrimary");
    }
    return [...assignments];
  }
}
