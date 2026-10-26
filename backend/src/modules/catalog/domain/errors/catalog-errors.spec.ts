import {
  BusinessRuleViolationError,
  type DomainError,
  InvalidValueError,
} from "../../../../shared/domain/errors/index.js";
import { CategoryCycleError } from "./category-cycle-error.js";
import { CategoryDeletedError } from "./category-deleted-error.js";
import { CategoryHasActiveChildrenError } from "./category-has-active-children-error.js";
import { CategoryInUseError } from "./category-in-use-error.js";
import { CategoryNotDeletedError } from "./category-not-deleted-error.js";
import { InvalidCategoryAssignmentError } from "./invalid-category-assignment-error.js";
import { InvalidCategoryNameError } from "./invalid-category-name-error.js";
import { InvalidDescriptionError } from "./invalid-description-error.js";
import { InvalidNewUntilError } from "./invalid-new-until-error.js";
import { InvalidPriceError } from "./invalid-price-error.js";
import { InvalidProductTitleError } from "./invalid-product-title-error.js";
import { InvalidSaleEndError } from "./invalid-sale-end-error.js";
import { InvalidSkuError } from "./invalid-sku-error.js";
import { InvalidSortOrderError } from "./invalid-sort-order-error.js";
import { InvalidStockError } from "./invalid-stock-error.js";
import { ParentCategoryUnavailableError } from "./parent-category-unavailable-error.js";
import { ProductDeletedError } from "./product-deleted-error.js";
import { ProductNotDeletedError } from "./product-not-deleted-error.js";
import { SalePriceNotLowerError } from "./sale-price-not-lower-error.js";
import { SelfRelatedProductError } from "./self-related-product-error.js";

type Base = typeof InvalidValueError | typeof BusinessRuleViolationError;

const CASES: [DomainError, Base, string, string][] = [
  [
    new InvalidCategoryAssignmentError("severalPrimary"),
    InvalidValueError,
    "INVALID_CATEGORY_ASSIGNMENT",
    "El producto tiene que tener una sola categoría principal.",
  ],
  [
    new InvalidCategoryNameError(),
    InvalidValueError,
    "INVALID_CATEGORY_NAME",
    "El nombre de la categoría no puede estar vacío ni tener más de 100 caracteres.",
  ],
  [
    new InvalidDescriptionError(2000),
    InvalidValueError,
    "INVALID_DESCRIPTION",
    "La descripción no puede tener más de 2000 caracteres.",
  ],
  [
    new InvalidSortOrderError(),
    InvalidValueError,
    "INVALID_SORT_ORDER",
    "El orden tiene que ser un número entero desde 0.",
  ],
  [
    new CategoryCycleError(),
    BusinessRuleViolationError,
    "CATEGORY_CYCLE",
    "Una categoría no puede ubicarse dentro de sí misma ni de una de sus subcategorías.",
  ],
  [
    new CategoryDeletedError(),
    BusinessRuleViolationError,
    "CATEGORY_DELETED",
    "La categoría está dada de baja. Reactivala antes de modificarla.",
  ],
  [
    new CategoryNotDeletedError(),
    BusinessRuleViolationError,
    "CATEGORY_NOT_DELETED",
    "La categoría no está dada de baja.",
  ],
  [
    new ParentCategoryUnavailableError(),
    BusinessRuleViolationError,
    "PARENT_CATEGORY_UNAVAILABLE",
    "La categoría padre está dada de baja. Reactivala primero o mové esta categoría a la raíz.",
  ],
  [
    new CategoryHasActiveChildrenError(),
    BusinessRuleViolationError,
    "CATEGORY_HAS_ACTIVE_CHILDREN",
    "La categoría tiene subcategorías activas. Dalas de baja o movelas primero.",
  ],
  [
    new CategoryInUseError(),
    BusinessRuleViolationError,
    "CATEGORY_IN_USE",
    "La categoría es la única de algunos productos. Asignales otra categoría primero.",
  ],
  [
    new InvalidSkuError(),
    InvalidValueError,
    "INVALID_SKU",
    "El SKU tiene que tener el formato LMS- seguido de al menos 6 dígitos.",
  ],
  [
    new InvalidCategoryAssignmentError("empty"),
    InvalidValueError,
    "INVALID_CATEGORY_ASSIGNMENT",
    "El producto tiene que tener al menos una categoría.",
  ],
  [
    new InvalidCategoryAssignmentError("duplicated"),
    InvalidValueError,
    "INVALID_CATEGORY_ASSIGNMENT",
    "Las categorías del producto no pueden repetirse.",
  ],
  [
    new InvalidCategoryAssignmentError("primaryMissing"),
    InvalidValueError,
    "INVALID_CATEGORY_ASSIGNMENT",
    "La categoría principal tiene que estar entre las categorías del producto.",
  ],
  [
    new InvalidProductTitleError(),
    InvalidValueError,
    "INVALID_PRODUCT_TITLE",
    "El título no puede estar vacío ni tener más de 200 caracteres.",
  ],
  [
    new InvalidPriceError(),
    InvalidValueError,
    "INVALID_PRICE",
    "El precio tiene que ser mayor a cero.",
  ],
  [
    new SalePriceNotLowerError(),
    BusinessRuleViolationError,
    "SALE_PRICE_NOT_LOWER",
    "El precio de oferta tiene que ser mayor a cero y menor al precio.",
  ],
  [
    new InvalidSaleEndError(),
    InvalidValueError,
    "INVALID_SALE_END",
    "El vencimiento de la oferta tiene que ser una fecha futura.",
  ],
  [
    new InvalidNewUntilError(),
    InvalidValueError,
    "INVALID_NEW_UNTIL",
    "El vencimiento de la novedad tiene que ser una fecha futura.",
  ],
  [
    new InvalidStockError(),
    InvalidValueError,
    "INVALID_STOCK",
    "El stock tiene que ser un número entero desde 0.",
  ],
  [
    new SelfRelatedProductError(),
    BusinessRuleViolationError,
    "SELF_RELATED_PRODUCT",
    "Un producto no puede figurar como similar de sí mismo.",
  ],
  [
    new ProductDeletedError(),
    BusinessRuleViolationError,
    "PRODUCT_DELETED",
    "El producto está dado de baja. Reactivalo antes de modificarlo.",
  ],
  [
    new ProductNotDeletedError(),
    BusinessRuleViolationError,
    "PRODUCT_NOT_DELETED",
    "El producto no está dado de baja.",
  ],
];

describe("catalog errors", () => {
  it.each(CASES)(
    "%o answers as its base with a stable code and its message",
    (error, base, code, message) => {
      expect(error).toBeInstanceOf(base);
      expect(error).toMatchObject({ code, message });
    },
  );
});
