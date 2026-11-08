import { productsContent } from "../content/products";
import type { AdminProductRow } from "../domain/admin-product";

interface MarkBadgesProps {
  product: AdminProductRow;
}

const BADGE = "rounded-full px-2 py-0.5 text-xs font-semibold";

/** The marks a product carries today (an offer or a novelty that expired is not shown). */
export const MarkBadges = ({ product }: MarkBadgesProps) => {
  const { marks, noMarks } = productsContent.table;
  if (!product.isFeatured && !product.isOnSale && !product.isNew) {
    return <span className="text-ink-soft">{noMarks}</span>;
  }
  return (
    <span className="flex flex-wrap gap-1">
      {product.isFeatured && (
        <span className={`${BADGE} bg-gold-soft text-gold-deep`}>{marks.featured}</span>
      )}
      {product.isOnSale && (
        <span className={`${BADGE} bg-coral-soft text-coral-strong`}>{marks.onSale}</span>
      )}
      {product.isNew && (
        <span className={`${BADGE} bg-teal-soft text-teal-deep`}>{marks.isNew}</span>
      )}
    </span>
  );
};
