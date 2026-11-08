import { PackageSearch } from "lucide-react";
import Link from "next/link";

import { StatusMessage } from "@/modules/core/ui/StatusMessage";
import { Button } from "@/modules/core/ui/primitives/button";

import { productsContent } from "../content/products";
import { PRODUCTS_PATH } from "../domain/products-query";

interface ProductsEmptyStateProps {
  /** Something narrows the list, so a different search or no filters may bring products. */
  filtered: boolean;
  onClear: () => void;
}

export const ProductsEmptyState = ({ filtered, onClear }: ProductsEmptyStateProps) => {
  const { empty, clear, newProduct } = productsContent;
  return (
    <div className="p-4">
      <StatusMessage
        icon={PackageSearch}
        title={filtered ? empty.filteredTitle : empty.noneTitle}
        description={filtered ? empty.filteredText : empty.noneText}
        actions={
          filtered ? (
            <Button type="button" variant="outline" onClick={onClear}>
              {clear}
            </Button>
          ) : (
            <Button asChild>
              <Link href={`${PRODUCTS_PATH}/nuevo`}>{newProduct}</Link>
            </Button>
          )
        }
      />
    </div>
  );
};
