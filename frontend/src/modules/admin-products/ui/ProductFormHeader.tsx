import { ArrowLeft, Archive } from "lucide-react";
import Link from "next/link";

import { Eyebrow } from "@/modules/core/ui/Eyebrow";
import { ConfirmDialog } from "@/modules/core/ui/ConfirmDialog";
import { Button } from "@/modules/core/ui/primitives/button";

import { useProductActions } from "../application/useProductActions";
import { productFormText } from "../content/product-form";
import { productsContent } from "../content/products";
import type { AdminProductDetail } from "../domain/admin-product";
import { productState } from "../domain/product-state";
import { PRODUCTS_PATH } from "../domain/products-query";
import { StateBadge } from "./StateBadge";

interface ProductFormHeaderProps {
  /** Absent when creating. */
  product?: AdminProductDetail;
}

export const ProductFormHeader = ({ product }: ProductFormHeaderProps) => {
  const { remove, isPending } = useProductActions();
  const { back, newTitle, newLead, remove: removeLabel } = productFormText;
  const state = product ? productState(product) : undefined;

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Link
          href={PRODUCTS_PATH}
          className="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-teal outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {back}
        </Link>
        <Eyebrow className="mt-3">{productsContent.eyebrow}</Eyebrow>
        <h1 className="mt-1 text-[1.9rem] font-semibold">{product?.title ?? newTitle}</h1>
        {product && state ? (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <span className="font-mono">{product.sku}</span>
            <span aria-hidden="true">·</span>
            <span>/{product.slug}</span>
            <StateBadge state={state} />
          </p>
        ) : (
          <p className="mt-1 max-w-[60ch] text-ink-soft">{newLead}</p>
        )}
      </div>
      {product && state !== "deleted" && (
        <ConfirmDialog
          title={productsContent.confirmRemove.title(product.title)}
          description={productsContent.confirmRemove.description}
          confirmLabel={productsContent.confirmRemove.confirm}
          onConfirm={() => void remove(product.id)}
          disabled={isPending(product.id)}
        >
          <Button type="button" variant="outline" disabled={isPending(product.id)}>
            <Archive aria-hidden="true" />
            {removeLabel}
          </Button>
        </ConfirmDialog>
      )}
    </header>
  );
};
