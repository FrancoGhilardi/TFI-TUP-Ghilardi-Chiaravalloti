"use client";

import { Tag } from "lucide-react";

import { ApiError } from "@/modules/core/http";
import { FormSkeleton } from "@/modules/core/ui/FormSkeleton";
import { LoadErrorState } from "@/modules/core/ui/LoadErrorState";
import { NotFoundState } from "@/modules/core/ui/NotFoundState";

import { useCategory } from "../application/useCategory";
import { categoryFormText } from "../content/categories";
import { CATEGORIES_PATH } from "../domain/categories-query";
import { CategoryForm } from "./CategoryForm";

interface EditCategoryPageProps {
  id: string;
}

/** The screen to edit a category: it loads it first, and says so if it is missing or fails. */
export const EditCategoryPage = ({ id }: EditCategoryPageProps) => {
  const { data, isPending, error, refetch } = useCategory(id);

  if (isPending) {
    return <FormSkeleton label={categoryFormText.loading} />;
  }
  if (!data) {
    return error instanceof ApiError && error.status === 404 ? (
      <NotFoundState {...categoryFormText.notFound} href={CATEGORIES_PATH} icon={Tag} />
    ) : (
      <LoadErrorState {...categoryFormText.loadError} onRetry={() => void refetch()} />
    );
  }
  // Remounted when the category is deleted or restored, so the form starts from what is saved;
  // any other refresh must not throw away what the person has typed.
  const version = `${data.id}-${data.deletedAt?.getTime() ?? 0}`;
  return <CategoryForm key={version} category={data} />;
};
