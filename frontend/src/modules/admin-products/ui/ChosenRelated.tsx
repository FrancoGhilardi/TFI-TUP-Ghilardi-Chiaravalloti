import { ArrowDown, ArrowUp, X } from "lucide-react";

import { productPickersText } from "../content/product-form";
import type { RelatedChoice } from "../domain/product-form";

const BUTTON =
  "grid size-8 place-items-center rounded-full text-ink-soft outline-none hover:bg-wheat hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40";

interface ChosenRelatedProps {
  products: RelatedChoice[];
  onMove: (from: number, to: number) => void;
  onRemove: (id: string) => void;
}

/** The related products picked, in the order the store shows them, with ways to change it. */
export const ChosenRelated = ({ products, onMove, onRemove }: ChosenRelatedProps) => {
  const { chosen, none, moveUp, moveDown, remove } = productPickersText.related;

  if (products.length === 0) {
    return <p className="text-sm text-ink-soft">{none}</p>;
  }
  return (
    <ol aria-label={chosen} className="flex flex-col gap-2">
      {products.map(({ id, title, sku }, index) => (
        <li
          key={id}
          className="flex items-center gap-2 rounded-xl border border-line-soft px-3 py-2"
        >
          <span aria-hidden="true" className="w-5 text-sm font-semibold text-ink-soft">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{title}</span>
            <span className="font-mono text-xs text-ink-soft">{sku}</span>
          </span>
          <button
            type="button"
            aria-label={moveUp(title)}
            title={moveUp(title)}
            disabled={index === 0}
            onClick={() => onMove(index, index - 1)}
            className={BUTTON}
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={moveDown(title)}
            title={moveDown(title)}
            disabled={index === products.length - 1}
            onClick={() => onMove(index, index + 1)}
            className={BUTTON}
          >
            <ArrowDown className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={remove(title)}
            title={remove(title)}
            onClick={() => onRemove(id)}
            className={BUTTON}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ol>
  );
};
