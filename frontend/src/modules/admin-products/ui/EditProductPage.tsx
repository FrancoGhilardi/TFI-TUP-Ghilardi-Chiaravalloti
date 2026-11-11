"use client";

import { PackageSearch } from "lucide-react";

import { ApiError } from "@/modules/core/http";
import { FormSkeleton } from "@/modules/core/ui/FormSkeleton";
import { LoadErrorState } from "@/modules/core/ui/LoadErrorState";
import { NotFoundState } from "@/modules/core/ui/NotFoundState";

import { useProduct } from "../application/useProduct";
import { productFormText } from "../content/product-form";
import { PRODUCTS_PATH } from "../domain/products-query";
import { ProductForm } from "./ProductForm";

interface EditProductPageProps {
  id: string;
}

/** The screen to edit a product: it loads it first, and says so if it is missing or fails. */
export const EditProductPage = ({ id }: EditProductPageProps) => {
  const { data, isPending, error, refetch } = useProduct(id);

  if (isPending) {
    return <FormSkeleton label={productFormText.loading} />;
  }
  if (!data) {
    return error instanceof ApiError && error.status === 404 ? (
      <NotFoundState {...productFormText.notFound} href={PRODUCTS_PATH} icon={PackageSearch} />
    ) : (
      <LoadErrorState {...productFormText.loadError} onRetry={() => void refetch()} />
    );
  }
  // Remounted whenever the product changes on the server (it was deleted or restored), so the form
  // always starts from what is saved.
  const version = `${data.id}-${data.updatedAt.getTime()}-${data.deletedAt?.getTime() ?? 0}`;
  return <ProductForm key={version} product={data} />;
};
