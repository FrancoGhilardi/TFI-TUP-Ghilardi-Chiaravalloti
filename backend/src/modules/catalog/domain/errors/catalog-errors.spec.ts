import {
  BusinessRuleViolationError,
  ConflictError,
  type DomainError,
  InvalidValueError,
} from "../../../../shared/domain/errors/index.js";
import { CategoryCycleError } from "./category-cycle-error.js";
import { CategoryDeletedError } from "./category-deleted-error.js";
import { CategoryHasActiveChildrenError } from "./category-has-active-children-error.js";
import { CategoryInUseError } from "./category-in-use-error.js";
import { CategoryNameInUseError } from "./category-name-in-use-error.js";
import { CategoryNotDeletedError } from "./category-not-deleted-error.js";
import { CategoryUnavailableError } from "./category-unavailable-error.js";
import { InvalidCategoryAssignmentError } from "./invalid-category-assignment-error.js";
import { InvalidCategoryNameError } from "./invalid-category-name-error.js";
import { InvalidDescriptionError } from "./invalid-description-error.js";
import { InvalidImageCountError } from "./invalid-image-count-error.js";
import { ImageNotFailedError } from "./image-not-failed-error.js";
import { InvalidImageError } from "./invalid-image-error.js";
import { InvalidImageOrderError } from "./invalid-image-order-error.js";
import { LastProductImageError } from "./last-product-image-error.js";
import { InvalidNewUntilError } from "./invalid-new-until-error.js";
import { InvalidPriceError } from "./invalid-price-error.js";
import { InvalidProductTitleError } from "./invalid-product-title-error.js";
import { InvalidRelatedProductsError } from "./invalid-related-products-error.js";
import { InvalidSaleEndError } from "./invalid-sale-end-error.js";
import { InvalidSkuError } from "./invalid-sku-error.js";
import { InvalidSortOrderError } from "./invalid-sort-order-error.js";
import { InvalidStockError } from "./invalid-stock-error.js";
import { ParentCategoryUnavailableError } from "./parent-category-unavailable-error.js";
import { ProductDeletedError } from "./product-deleted-error.js";
import { ProductImageLimitReachedError } from "./product-image-limit-reached-error.js";
import { ProductNotDeletedError } from "./product-not-deleted-error.js";
import { ProductWithoutCategoryError } from "./product-without-category-error.js";
import { RelatedProductUnavailableError } from "./related-product-unavailable-error.js";
import { SalePriceNotLowerError } from "./sale-price-not-lower-error.js";
import { SelfRelatedProductError } from "./self-related-product-error.js";

type Base = typeof InvalidValueError | typeof BusinessRuleViolationError | typeof ConflictError;

const CASES: [DomainError, Base, string, string][] = [
  [
    new CategoryUnavailableError(),
    BusinessRuleViolationError,
    "CATEGORY_UNAVAILABLE",
    "Alguna de las categorías elegidas no existe, está inactiva o fue dada de baja.",
  ],
  [
    new RelatedProductUnavailableError(),
    BusinessRuleViolationError,
    "RELATED_PRODUCT_UNAVAILABLE",
    "Alguno de los productos similares elegidos no existe o fue dado de baja.",
  ],
  [
    new InvalidRelatedProductsError("duplicated"),
    InvalidValueError,
    "INVALID_RELATED_PRODUCTS",
    "Los productos similares no pueden repetirse.",
  ],
  [
    new InvalidRelatedProductsError("tooMany"),
    InvalidValueError,
    "INVALID_RELATED_PRODUCTS",
    "Elegí hasta 4 productos similares.",
  ],
  [
    new InvalidImageCountError(),
    InvalidValueError,
    "INVALID_IMAGE_COUNT",
    "El producto tiene que tener entre 1 y 5 imágenes.",
  ],
  [
    new InvalidImageError("type", 2),
    InvalidValueError,
    "INVALID_IMAGE",
    "La imagen 2 tiene que ser JPEG, PNG o WebP.",
  ],
  [
    new InvalidImageError("size", 1),
    InvalidValueError,
    "INVALID_IMAGE",
    "La imagen 1 no puede pesar más de 10 MB.",
  ],
  [
    new InvalidImageError("type", "single"),
    InvalidValueError,
    "INVALID_IMAGE",
    "La imagen tiene que ser JPEG, PNG o WebP.",
  ],
  [
    new InvalidImageError("size"),
    InvalidValueError,
    "INVALID_IMAGE",
    "Las imágenes no pueden pesar más de 10 MB.",
  ],
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
    "La categoría padre no existe o está dada de baja.",
  ],
  [
    new CategoryHasActiveChildrenError(2),
    BusinessRuleViolationError,
    "CATEGORY_HAS_ACTIVE_CHILDREN",
    "La categoría tiene subcategorías. Dalas de baja o movelas a otra categoría primero.",
  ],
  [
    new CategoryInUseError(3),
    BusinessRuleViolationError,
    "CATEGORY_IN_USE",
    "La categoría es la única de algunos productos. Asignales otra categoría primero.",
  ],
  [
    new CategoryNameInUseError(),
    ConflictError,
    "CATEGORY_NAME_IN_USE",
    "Ya existe una categoría con ese nombre.",
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
    new InvalidImageOrderError(),
    InvalidValueError,
    "INVALID_IMAGE_ORDER",
    "Mandá todas las imágenes del producto, cada una una sola vez.",
  ],
  [
    new LastProductImageError(),
    BusinessRuleViolationError,
    "LAST_PRODUCT_IMAGE",
    "El producto tiene que tener al menos una imagen. Subí otra antes de borrar esta.",
  ],
  [
    new ImageNotFailedError(),
    BusinessRuleViolationError,
    "IMAGE_NOT_FAILED",
    "Solo se puede reintentar una imagen cuyo procesado falló.",
  ],
  [
    new ProductImageLimitReachedError(),
    BusinessRuleViolationError,
    "PRODUCT_IMAGE_LIMIT_REACHED",
    "El producto ya tiene 5 imágenes. Borrá una para subir otra.",
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
  [
    new ProductWithoutCategoryError(),
    BusinessRuleViolationError,
    "PRODUCT_WITHOUT_CATEGORY",
    "El producto no tiene ninguna categoría vigente. Reactivá alguna de sus categorías antes de reactivarlo.",
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

  it.each([
    [new CategoryHasActiveChildrenError(2), 2],
    [new CategoryInUseError(3), 3],
  ])("%o tells how many records block the deletion", (error, count) => {
    expect(error.publicDetails).toEqual({ count });
  });
});
