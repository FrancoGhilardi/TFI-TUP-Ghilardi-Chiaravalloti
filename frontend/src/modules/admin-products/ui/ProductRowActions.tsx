import { Archive, Pencil, RotateCcw } from "lucide-react";

import { ConfirmRowAction } from "@/modules/core/ui/ConfirmRowAction";
import { RowActionButton } from "@/modules/core/ui/RowActionButton";
import { RowActionLink } from "@/modules/core/ui/RowActionLink";
import { RowActions } from "@/modules/core/ui/RowActions";

import { productsContent } from "../content/products";
import type { AdminProductRow } from "../domain/admin-product";
import { productState } from "../domain/product-state";
import { PRODUCTS_PATH } from "../domain/products-query";

interface ProductRowActionsProps {
  product: AdminProductRow;
  /** A request for this product is on its way. */
  pending: boolean;
  onRemove: () => void;
  onRestore: () => void;
}

/** Open the product, and either give it a logical delete or bring it back. */
export const ProductRowActions = ({
  product,
  pending,
  onRemove,
  onRestore,
}: ProductRowActionsProps) => {
  const { actions, confirmRemove } = productsContent;
  const { title } = product;
  const deleted = productState(product) === "deleted";

  return (
    <RowActions>
      <RowActionLink
        icon={Pencil}
        label={deleted ? actions.view(title) : actions.edit(title)}
        href={`${PRODUCTS_PATH}/${product.id}`}
      />
      {deleted ? (
        <RowActionButton
          icon={RotateCcw}
          label={actions.restore(title)}
          disabled={pending}
          onClick={onRestore}
        />
      ) : (
        <ConfirmRowAction
          icon={Archive}
          label={actions.remove(title)}
          dialog={{ ...confirmRemove, title: confirmRemove.title(title) }}
          onConfirm={onRemove}
          pending={pending}
        />
      )}
    </RowActions>
  );
};
