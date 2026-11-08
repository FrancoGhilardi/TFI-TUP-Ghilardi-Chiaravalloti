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

/** A table from the medium width; below it every row is a card with the same information. */
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
  const plain = "px-3 py-3 text-left font-semibold text-ink-soft";

  return (
    <table className="w-full text-sm max-md:block">
      <caption className="sr-only">{caption}</caption>
      <thead className="max-md:sr-only">
        <tr className="text-xs tracking-wide uppercase">
          <SortHeader column="titulo" label={columns.product} query={query} go={go} />
          <SortHeader column="sku" label={columns.sku} query={query} go={go} />
          <th scope="col" className={plain}>
            {columns.category}
          </th>
          <SortHeader column="precio" label={columns.price} query={query} go={go} numeric />
          <SortHeader column="stock" label={columns.stock} query={query} go={go} numeric />
          <th scope="col" className={plain}>
            {columns.marks}
          </th>
          <th scope="col" className={plain}>
            {columns.state}
          </th>
          <SortHeader column="modificado" label={columns.modified} query={query} go={go} />
          <th scope="col" className="px-3 py-3">
            <span className="sr-only">{columns.actions}</span>
          </th>
        </tr>
      </thead>
      <tbody className="max-md:block max-md:space-y-3 max-md:p-3">
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
      </tbody>
    </table>
  );
};
