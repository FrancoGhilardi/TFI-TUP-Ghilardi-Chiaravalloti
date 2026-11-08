import { Archive, Pencil, RotateCcw } from "lucide-react";
import Link from "next/link";

import { ConfirmDialog } from "@/modules/core/ui/ConfirmDialog";

import { productsContent } from "../content/products";
import type { AdminProductRow } from "../domain/admin-product";
import { productState } from "../domain/product-state";
import { PRODUCTS_PATH } from "../domain/products-query";

const BUTTON =
  "grid size-9 place-items-center rounded-full text-ink-soft outline-none hover:bg-wheat hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50";

interface RowActionsProps {
  product: AdminProductRow;
  /** A request for this product is on its way. */
  pending: boolean;
  onRemove: () => void;
  onRestore: () => void;
}

/** Open the product, and either give it a logical delete or bring it back. */
export const RowActions = ({ product, pending, onRemove, onRestore }: RowActionsProps) => {
  const { actions, confirmRemove } = productsContent;
  const deleted = productState(product) === "deleted";
  const open = deleted ? actions.view(product.title) : actions.edit(product.title);

  return (
    <span className="flex items-center justify-end gap-1">
      <Link
        href={`${PRODUCTS_PATH}/${product.id}`}
        aria-label={open}
        title={open}
        className={BUTTON}
      >
        <Pencil className="size-[18px]" aria-hidden="true" />
      </Link>
      {deleted ? (
        <button
          type="button"
          aria-label={actions.restore(product.title)}
          title={actions.restore(product.title)}
          disabled={pending}
          onClick={onRestore}
          className={BUTTON}
        >
          <RotateCcw className="size-[18px]" aria-hidden="true" />
        </button>
      ) : (
        <ConfirmDialog
          title={confirmRemove.title(product.title)}
          description={confirmRemove.description}
          confirmLabel={confirmRemove.confirm}
          onConfirm={onRemove}
          disabled={pending}
        >
          <button
            type="button"
            aria-label={actions.remove(product.title)}
            title={actions.remove(product.title)}
            disabled={pending}
            className={BUTTON}
          >
            <Archive className="size-[18px]" aria-hidden="true" />
          </button>
        </ConfirmDialog>
      )}
    </span>
  );
};
