"use client";

import { FormProvider } from "react-hook-form";

import { cn } from "@/modules/core/lib/utils";
import { FormAlert } from "@/modules/core/ui/FormAlert";

import { useProductForm } from "../application/useProductForm";
import type { AdminProductDetail } from "../domain/admin-product";
import { initialValuesOf } from "../domain/product-form";
import { CategoriesSection } from "./CategoriesSection";
import { DataSection } from "./DataSection";
import { DeletedNotice } from "./DeletedNotice";
import { ImagesSection } from "./ImagesSection";
import { ProductFormHeader } from "./ProductFormHeader";
import { PublicationPanel } from "./PublicationPanel";
import { RelatedSection } from "./RelatedSection";
import { SavedImagesSection } from "./SavedImagesSection";
import { RecordPanel } from "./RecordPanel";
import { SaveBar } from "./SaveBar";

interface ProductFormProps {
  /** The product being edited; absent when creating one. */
  product?: AdminProductDetail;
}

/** The form to create a product or edit one, with what it has on screen and what it sends. */
export const ProductForm = ({ product }: ProductFormProps) => {
  const { form, submit, general, isSaving, canSave, changed } = useProductForm(
    product
      ? { mode: "edit", productId: product.id, initial: initialValuesOf(product) }
      : { mode: "create" },
  );
  const deleted = product?.deletedAt ? { ...product, deletedAt: product.deletedAt } : undefined;

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <ProductFormHeader product={product} />
        {deleted && <DeletedNotice product={deleted} />}
        <FormAlert message={general} />
        <div
          inert={Boolean(deleted)}
          className={cn("grid items-start gap-5 lg:grid-cols-[1fr_340px]", deleted && "opacity-75")}
        >
          <div className="flex flex-col gap-5">
            <DataSection editing={Boolean(product)} />
            {product ? <SavedImagesSection productId={product.id} /> : <ImagesSection />}
            <CategoriesSection known={product?.categories} />
            <RelatedSection productId={product?.id} />
          </div>
          <div className="flex flex-col gap-5">
            <PublicationPanel />
            {product && <RecordPanel product={product} />}
          </div>
        </div>
        {!deleted && (
          <SaveBar
            editing={Boolean(product)}
            changed={changed}
            canSave={canSave}
            saving={isSaving}
          />
        )}
      </form>
    </FormProvider>
  );
};
