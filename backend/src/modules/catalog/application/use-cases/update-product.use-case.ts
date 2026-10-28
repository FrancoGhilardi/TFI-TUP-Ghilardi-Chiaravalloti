import type { Clock } from "../../../../shared/application/clock.js";
import type { TransactionManager } from "../../../../shared/application/transaction-manager.js";
import type { UseCase } from "../../../../shared/application/use-case.js";
import { Money } from "../../../../shared/domain/value-objects/money.js";
import { Product } from "../../domain/entities/product.js";
import { ProductDeletedError } from "../../domain/errors/product-deleted-error.js";
import { runsAt } from "../../domain/runs-at.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { ProductRepository } from "../../domain/repositories/product.repository.js";
import { CategoryAssignment } from "../../domain/value-objects/category-assignment.js";
import type { AdminProductDetailResult } from "../dto/admin-product-detail.result.js";
import type { UpdateProductCommand } from "../dto/update-product.command.js";
import type { AdminProductQueries } from "../ports/admin-product-queries.js";
import {
  assertCategoriesVisible,
  assertRelatedExist,
  assertSomeCategoryCurrent,
  detailOf,
  loadProduct,
} from "../services/product-loading.js";

interface SaleChange {
  price: Money;
  endsAt?: Date;
}

/**
 * Edits the data, categories and related products of a product; the slug and the SKU never
 * change, not even with the title. A deleted product can only be restored, and an edit that
 * leaves everything as it was saves nothing.
 */
export class UpdateProductUseCase implements UseCase<
  UpdateProductCommand,
  AdminProductDetailResult
> {
  constructor(
    private readonly products: ProductRepository,
    private readonly categories: CategoryRepository,
    private readonly transaction: TransactionManager,
    private readonly queries: AdminProductQueries,
    private readonly clock: Clock,
  ) {}

  async execute(command: UpdateProductCommand): Promise<AdminProductDetailResult> {
    // Checked before the transaction, so a malformed amount or list never opens one.
    const price = command.price === undefined ? undefined : Money.fromDecimal(command.price);
    const sale: SaleChange | null | undefined = command.sale
      ? { price: Money.fromDecimal(command.sale.price), endsAt: command.sale.endsAt }
      : command.sale;
    const categories =
      command.categories &&
      CategoryAssignment.fromIds(command.categories.ids, command.categories.primaryId);
    const relatedIds = command.relatedProductIds;
    if (relatedIds) {
      Product.assertValidRelatedIds(command.productId, relatedIds);
    }

    await this.transaction.run(async () => {
      // Products are locked in id order: the related ones before this one share-locked first,
      // so two edits relating two products to each other wait instead of deadlocking.
      const lowerIds = relatedIds?.filter((id) => id < command.productId) ?? [];
      if (lowerIds.length > 0) {
        await this.products.findExistingIds(lowerIds);
      }
      const product = await loadProduct(this.products, command.productId);
      if (product.isDeleted()) {
        throw new ProductDeletedError();
      }
      // Read once the product is locked: dates are checked against the moment of the change.
      const now = this.clock.now();
      const before = snapshot(product);

      if (command.title !== undefined) {
        product.changeTitle(command.title);
      }
      if (command.description !== undefined) {
        product.changeDescription(command.description);
      }
      changePriceAndSale(product, price, sale, now);
      if (command.stock !== undefined) {
        product.setStock(command.stock);
      }
      if (command.isFeatured !== undefined) {
        product.setFeatured(command.isFeatured);
      }
      changeNewMark(product, command.newMark, now);
      if (command.sortOrder !== undefined) {
        product.changeSortOrder(command.sortOrder);
      }
      if (categories) {
        await this.assignCategories(product, categories);
      }
      if (relatedIds) {
        // Only the new ones are checked: one already related stays even if it was deleted,
        // so sending the form back never fails over it.
        const added = relatedIds.filter((id) => !product.relatedProductIds.includes(id));
        product.setRelatedProducts(relatedIds);
        await assertRelatedExist(this.products, added);
      }
      if (command.isActive === true) {
        product.activate();
      } else if (command.isActive === false) {
        product.deactivate();
      }

      // Saving an untouched product would still stamp updated_at in the database.
      if (snapshot(product) !== before) {
        product.markUpdatedBy(command.actorId);
        await this.products.save(product);
      }
    });

    return detailOf(this.queries, command.productId);
  }

  /**
   * A new category has to be visible, as on creation; one the product already had stays as it
   * is, even hidden or deleted, so sending the form back never fails over it. The product
   * still keeps a current category: a new one is, and otherwise one of those kept has to be.
   * Either way they stay share-locked, so a deletion waits and then counts this product.
   */
  private async assignCategories(
    product: Product,
    categories: CategoryAssignment[],
  ): Promise<void> {
    const assigned = new Set(product.categories.map((assignment) => assignment.categoryId));
    const ids = categories.map((assignment) => assignment.categoryId);
    const added = ids.filter((id) => !assigned.has(id));
    await assertCategoriesVisible(this.categories, added);
    if (added.length === 0) {
      await assertSomeCategoryCurrent(this.categories, ids);
    }
    product.assignCategories(categories);
  }
}

/**
 * A sale sent replaces the current one, which ends first so it never blocks the new price.
 * One sent just as it is stored changes nothing and is not checked again: sending the form
 * back with a sale that already ended does not fail, even once the nightly cleanup removed it.
 */
function changePriceAndSale(
  product: Product,
  price: Money | undefined,
  sale: SaleChange | null | undefined,
  now: Date,
): void {
  if (sale === undefined || isStoredSale(product, sale, now)) {
    if (price) {
      product.changePrice(price, now);
    }
    return;
  }
  product.endSale();
  if (price) {
    product.changePrice(price, now);
  }
  if (sale) {
    product.startSale(sale.price, sale.endsAt, now);
  }
}

function isStoredSale(product: Product, sale: SaleChange | null, now: Date): boolean {
  if (sale === null) {
    return !product.onSale;
  }
  // An ended sale is what the cleanup leaves as no sale at all.
  if (!product.onSale && !runsAt(sale.endsAt, now)) {
    return true;
  }
  return (
    product.onSale &&
    product.salePrice?.equals(sale.price) === true &&
    sameDate(product.saleEndsAt, sale.endsAt)
  );
}

/** Like the sale: a mark sent just as it is stored, or ended and already cleared, changes nothing. */
function changeNewMark(product: Product, mark: UpdateProductCommand["newMark"], now: Date): void {
  if (mark === undefined) {
    return;
  }
  if (mark === null) {
    product.unmarkAsNew();
    return;
  }
  if (product.isNewFlag && sameDate(product.newUntil, mark.until)) {
    return;
  }
  if (!product.isNewFlag && !runsAt(mark.until, now)) {
    return;
  }
  product.markAsNew(mark.until, now);
}

const sameDate = (stored: Date | undefined, sent: Date | undefined) =>
  stored?.getTime() === sent?.getTime();

/** What an edit can change, to tell whether it changed anything. */
function snapshot(product: Product): string {
  return JSON.stringify([
    product.title,
    product.description ?? null,
    product.price.toDecimalString(),
    product.onSale,
    product.salePrice?.toDecimalString() ?? null,
    product.saleEndsAt?.toISOString() ?? null,
    product.stock,
    product.featured,
    product.isNewFlag,
    product.newUntil?.toISOString() ?? null,
    product.sortOrder,
    product.active,
    // The order of the categories means nothing; that of the related products is shown.
    product.categories
      .map((assignment) => `${assignment.categoryId}:${assignment.isPrimary}`)
      .sort(),
    product.relatedProductIds,
  ]);
}
