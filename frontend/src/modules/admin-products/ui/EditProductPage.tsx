"use client";

import { ApiError } from "@/modules/core/http";

import { useProduct } from "../application/useProduct";
import { ProductForm } from "./ProductForm";
import { ProductFormSkeleton } from "./ProductFormSkeleton";
import { ProductLoadError } from "./ProductLoadError";
import { ProductNotFound } from "./ProductNotFound";

interface EditProductPageProps {
  id: string;
}

/** The screen to edit a product: it loads it first, and says so if it is missing or fails. */
export const EditProductPage = ({ id }: EditProductPageProps) => {
  const { data, isPending, error, refetch } = useProduct(id);

  if (isPending) {
    return <ProductFormSkeleton />;
  }
  if (!data) {
    return error instanceof ApiError && error.status === 404 ? (
      <ProductNotFound />
    ) : (
      <ProductLoadError onRetry={() => void refetch()} />
    );
  }
  // Remounted whenever the product changes on the server (it was deleted or restored), so the form
  // always starts from what is saved.
  const version = `${data.id}-${data.updatedAt.getTime()}-${data.deletedAt?.getTime() ?? 0}`;
  return <ProductForm key={version} product={data} />;
};
