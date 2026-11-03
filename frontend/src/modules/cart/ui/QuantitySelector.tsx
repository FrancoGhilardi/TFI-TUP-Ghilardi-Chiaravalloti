import { Minus, Plus } from "lucide-react";

import { cartContent } from "../content/cart";

interface QuantitySelectorProps {
  quantity: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}

const stepStyles =
  "grid size-11 place-items-center text-ink outline-none transition-colors hover:bg-wheat focus-visible:bg-wheat disabled:pointer-events-none disabled:opacity-40";

/** Picks how many units to add: one by one, never below one nor above what the caller allows. */
export const QuantitySelector = ({
  quantity,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
}: QuantitySelectorProps) => {
  const { label, less, more } = cartContent.quantity;
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center overflow-hidden rounded-full border-[1.5px] border-line"
    >
      <button
        type="button"
        aria-label={less}
        disabled={!canDecrease}
        onClick={onDecrease}
        className={stepStyles}
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className="min-w-10 text-center font-semibold tabular-nums">{quantity}</span>
      <button
        type="button"
        aria-label={more}
        disabled={!canIncrease}
        onClick={onIncrease}
        className={stepStyles}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
};
