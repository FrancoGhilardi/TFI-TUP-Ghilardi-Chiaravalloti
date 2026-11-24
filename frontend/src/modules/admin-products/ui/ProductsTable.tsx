import { ActionsHeaderCell } from "@/modules/core/ui/ActionsHeaderCell";
import { HeaderCell } from "@/modules/core/ui/HeaderCell";
import { ListTable } from "@/modules/core/ui/ListTable";

import { productsContent } from "../content/products";
import type { AdminProductRow } from "../domain/admin-product";
import type { ProductsQuery } from "../domain/products-query";
import { ProductsTableRow } from "./ProductsTableRow";
import { SortHeader } from "./SortHeader";

interface ProductsTableProps {
  products: AdminProductRow[];
  query: ProductsQuery;
  go: (changes: Partial<ProductsQuery>) => void;
  readAt: Date;
  isPending: (id: string) => boolean;
  onRemove: (id: string) => void;
  onRestore: (id: string) => void;
}

export const ProductsTable = ({
  products,
  query,
  go,
  readAt,
  isPending,
  onRemove,
  onRestore,
}: ProductsTableProps) => {
  const { caption, columns } = productsContent.table;

  return (
    <ListTable
      caption={caption}
      head={
        <>
          <SortHeader column="titulo" label={columns.product} query={query} go={go} />
          <SortHeader column="sku" label={columns.sku} query={query} go={go} />
          <HeaderCell>{columns.category}</HeaderCell>
          <SortHeader column="precio" label={columns.price} query={query} go={go} numeric />
          <SortHeader column="stock" label={columns.stock} query={query} go={go} numeric />
          <HeaderCell>{columns.marks}</HeaderCell>
          <HeaderCell>{columns.state}</HeaderCell>
          <SortHeader column="modificado" label={columns.modified} query={query} go={go} />
          <ActionsHeaderCell label={columns.actions} />
        </>
      }
    >
      {products.map((product) => (
        <ProductsTableRow
          key={product.id}
          product={product}
          readAt={readAt}
          pending={isPending(product.id)}
          onRemove={() => onRemove(product.id)}
          onRestore={() => onRestore(product.id)}
        />
      ))}
    </ListTable>
  );
};
