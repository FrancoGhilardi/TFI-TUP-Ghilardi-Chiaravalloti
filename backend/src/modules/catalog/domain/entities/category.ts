import { Entity } from "../../../../shared/domain/entity.js";
import type { Slug } from "../../../../shared/domain/value-objects/slug.js";
import { InvalidSlugError } from "../../../../shared/domain/errors/invalid-slug-error.js";
import {
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_SLUG_MAX_LENGTH,
} from "../catalog-limits.js";
import { CategoryCycleError } from "../errors/category-cycle-error.js";
import { CategoryDeletedError } from "../errors/category-deleted-error.js";
import { CategoryNotDeletedError } from "../errors/category-not-deleted-error.js";
import { InvalidCategoryNameError } from "../errors/invalid-category-name-error.js";
import { ParentCategoryUnavailableError } from "../errors/parent-category-unavailable-error.js";
import { optionalDescription, requiredText, sortOrder } from "../text.js";

export interface CategoryProps {
  id: string;
  /** Absent for a root category. */
  parentId?: string;
  name: string;
  /** Generated once from the name; it never changes. */
  slug: Slug;
  description?: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface NewCategoryProps {
  id: string;
  parentId?: string;
  name: string;
  slug: Slug;
  description?: string;
  sortOrder?: number;
  now: Date;
}

const checkedName = (name: string) =>
  requiredText(name, CATEGORY_NAME_MAX_LENGTH, () => new InvalidCategoryNameError());

/**
 * A category of the catalog, at the root or under another one. A deleted category can only
 * be restored, or moved to the root so it can be restored, and a change that leaves it as it
 * was does nothing.
 */
export class Category extends Entity {
  private constructor(private readonly props: CategoryProps) {
    super(props.id);
  }

  /** A new category is active. Its parent, if any, is checked to exist by the caller. */
  static create(input: NewCategoryProps): Category {
    if (input.parentId === input.id) {
      throw new CategoryCycleError();
    }
    // Its column is shorter than the general slug limit.
    if (input.slug.length > CATEGORY_SLUG_MAX_LENGTH) {
      throw new InvalidSlugError("tooLong");
    }
    return new Category({
      id: input.id,
      parentId: input.parentId,
      name: checkedName(input.name),
      slug: input.slug,
      description: optionalDescription(input.description, CATEGORY_DESCRIPTION_MAX_LENGTH),
      sortOrder: sortOrder(input.sortOrder ?? 0),
      active: true,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  static reconstitute(props: CategoryProps): Category {
    return new Category({ ...props });
  }

  get parentId(): string | undefined {
    return this.props.parentId;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): Slug {
    return this.props.slug;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get sortOrder(): number {
    return this.props.sortOrder;
  }

  get active(): boolean {
    return this.props.active;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  isDeleted(): boolean {
    return this.props.deletedAt !== undefined;
  }

  /** Shown in the store: active and not deleted. */
  isVisible(): boolean {
    return this.props.active && !this.isDeleted();
  }

  rename(name: string): void {
    this.assertNotDeleted();
    this.props.name = checkedName(name);
  }

  describe(description?: string): void {
    this.assertNotDeleted();
    this.props.description = optionalDescription(description, CATEGORY_DESCRIPTION_MAX_LENGTH);
  }

  /**
   * `ancestorIdsOfParent` are the categories above the new parent, up to the root: if this
   * category is among them, or is the parent itself, the move would close a loop.
   */
  moveTo(parentId: string, ancestorIdsOfParent: string[]): void {
    this.assertNotDeleted();
    if (parentId === this.id || ancestorIdsOfParent.includes(this.id)) {
      throw new CategoryCycleError();
    }
    this.props.parentId = parentId;
  }

  /** Also allowed while deleted, so a category whose parent is gone can be restored. */
  moveToRoot(): void {
    this.props.parentId = undefined;
  }

  changeSortOrder(order: number): void {
    this.assertNotDeleted();
    this.props.sortOrder = sortOrder(order);
  }

  activate(): void {
    this.assertNotDeleted();
    this.props.active = true;
  }

  deactivate(): void {
    this.assertNotDeleted();
    this.props.active = false;
  }

  /**
   * Deletion is always logical and keeps the active state, which a restore brings back. The
   * caller checks `CategoryDeletionPolicy` first.
   */
  softDelete(now: Date): void {
    if (this.isDeleted()) {
      return;
    }
    this.props.deletedAt = now;
  }

  /** `parentIsAvailable`: whether the parent, if any, is not deleted. */
  restore(parentIsAvailable: boolean): void {
    if (!this.isDeleted()) {
      throw new CategoryNotDeletedError();
    }
    if (this.props.parentId !== undefined && !parentIsAvailable) {
      throw new ParentCategoryUnavailableError();
    }
    this.props.deletedAt = undefined;
  }

  private assertNotDeleted(): void {
    if (this.isDeleted()) {
      throw new CategoryDeletedError();
    }
  }
}
