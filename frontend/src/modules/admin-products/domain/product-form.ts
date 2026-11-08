import { z } from "zod";

import {
  DESCRIPTION_MAX_LENGTH,
  NUMBER_MAX,
  productFormErrors as errors,
  RELATED_MAX,
  TITLE_MAX_LENGTH,
} from "../content/product-form";
import type { AdminProductDetail } from "./admin-product";
import { instantOffsetMinutes, isoToDay, isPastDay, isValidDay } from "./day-input";
import { MAX_ALT_TEXT_LENGTH, MAX_IMAGES } from "./image-rules";
import { parsePriceInput, priceToInput } from "./price-input";

const length = (text: string) => [...text].length;

const shape = z.object({
  title: z.string(),
  description: z.string(),
  price: z.string(),
  stock: z.string(),
  sortOrder: z.string(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  isOnSale: z.boolean(),
  salePrice: z.string(),
  /** A day, `YYYY-MM-DD`, or empty. */
  saleEndsAt: z.string(),
  isNew: z.boolean(),
  newUntil: z.string(),
  categoryIds: z.array(z.string()),
  primaryCategoryId: z.string(),
  /** Kept with their title and SKU to show them, and in the order they are shown. */
  relatedProducts: z.array(z.object({ id: z.string(), title: z.string(), sku: z.string() })),
  /** Only when creating: the files to upload with the product. */
  images: z.array(z.object({ key: z.string(), file: z.instanceof(File), altText: z.string() })),
});

export type ProductFormValues = z.infer<typeof shape>;
/** A related product as the form keeps it. */
export type RelatedChoice = ProductFormValues["relatedProducts"][number];
export type ProductFormField = keyof ProductFormValues;

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  title: "",
  description: "",
  price: "",
  stock: "",
  sortOrder: "0",
  isActive: true,
  isFeatured: false,
  isOnSale: false,
  salePrice: "",
  saleEndsAt: "",
  isNew: false,
  newUntil: "",
  categoryIds: [],
  primaryCategoryId: "",
  relatedProducts: [],
  images: [],
};

export interface ProductFormContext {
  mode: "create" | "edit";
  now: Date;
  /** Minutes ahead of UTC of the person's zone on a day. */
  offsetOf: (day: string) => number;
  /** How the form opened, when editing: a day it brought and nobody touched is left alone. */
  initial?: ProductFormValues;
}

const isCount = (text: string) => /^\d+$/.test(text.trim()) && Number(text) <= NUMBER_MAX;

/** The rules of the form: what the browser checks before anything is sent. */
export function productFormSchema({ mode, now, offsetOf, initial }: ProductFormContext) {
  return shape.superRefine((values, context) => {
    const fail = (path: (string | number)[], message: string) =>
      context.addIssue({ code: "custom", path, message });

    const title = values.title.trim();
    if (title === "") {
      fail(["title"], errors.title.required);
    } else if (length(title) > TITLE_MAX_LENGTH) {
      fail(["title"], errors.title.tooLong);
    }
    if (length(values.description.trim()) > DESCRIPTION_MAX_LENGTH) {
      fail(["description"], errors.description.tooLong);
    }

    const price = parsePriceInput(values.price);
    if (!price.ok) {
      fail(["price"], errors.price[price.reason]);
    }
    if (!isCount(values.stock)) {
      fail(["stock"], errors.stock);
    }
    if (!isCount(values.sortOrder)) {
      fail(["sortOrder"], errors.sortOrder);
    }

    const checkDay = (field: "saleEndsAt" | "newUntil") => {
      const day = values[field];
      if (day === "") {
        return;
      }
      if (!isValidDay(day)) {
        fail([field], errors.day.invalid);
      } else if (day !== initial?.[field] && isPastDay(day, now, offsetOf(day))) {
        fail([field], errors.day.past);
      }
    };

    if (values.isOnSale) {
      const sale = parsePriceInput(values.salePrice);
      if (!sale.ok) {
        fail(["salePrice"], errors.salePrice[sale.reason]);
      } else if (price.ok && sale.cents >= price.cents) {
        fail(["salePrice"], errors.salePrice.notLower);
      }
      checkDay("saleEndsAt");
    }
    if (values.isNew) {
      checkDay("newUntil");
    }

    if (values.categoryIds.length === 0) {
      fail(["categoryIds"], errors.categories.none);
    } else if (!values.categoryIds.includes(values.primaryCategoryId)) {
      fail(["categoryIds"], errors.categories.noPrimary);
    }
    if (values.relatedProducts.length > RELATED_MAX) {
      fail(["relatedProducts"], errors.related.tooMany);
    }

    if (mode === "create") {
      if (values.images.length === 0) {
        fail(["images"], errors.images.none);
      } else if (values.images.length > MAX_IMAGES) {
        fail(["images"], errors.images.tooMany);
      }
    }
    values.images.forEach((image, index) => {
      if (length(image.altText.trim()) > MAX_ALT_TEXT_LENGTH) {
        fail(["images", index, "altText"], errors.altText);
      }
    });
  });
}

/** The values a product has when its form opens for editing. */
export function initialValuesOf(
  product: AdminProductDetail,
  offsetFor: (instant: Date) => number = instantOffsetMinutes,
): ProductFormValues {
  const dayOf = (instant: Date | null) => (instant ? isoToDay(instant, offsetFor(instant)) : "");
  return {
    title: product.title,
    description: product.description ?? "",
    price: priceToInput(product.price),
    stock: String(product.stock),
    sortOrder: String(product.sortOrder),
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    isOnSale: product.isOnSale,
    salePrice: product.salePrice ? priceToInput(product.salePrice) : "",
    saleEndsAt: dayOf(product.saleEndsAt),
    isNew: product.isNew,
    newUntil: dayOf(product.newUntil),
    categoryIds: product.categories.map(({ id }) => id),
    primaryCategoryId: product.primaryCategoryId,
    relatedProducts: product.relatedProducts.map(({ id, title, sku }) => ({ id, title, sku })),
    images: [],
  };
}
