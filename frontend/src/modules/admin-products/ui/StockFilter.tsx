import { useDebouncedInput } from "@/modules/core/hooks/useDebouncedInput";

import { productsContent } from "../content/products";

const STOCK_PAUSE_MS = 300;

interface StockFilterProps {
  /** The biggest stock as the address has it, or an empty text. */
  value: string;
  /** Called with a whole number, or an empty text to remove the filter. */
  onChange: (value: string) => void;
}

/** "Stock ≤ N": only whole numbers go on, so the address never holds one the API would refuse. */
export const StockFilter = ({ value, onChange }: StockFilterProps) => {
  const [text, setText] = useDebouncedInput(
    value,
    (typed) => {
      if (/^\d*$/.test(typed)) {
        onChange(typed);
      }
    },
    STOCK_PAUSE_MS,
  );
  const { label, ariaLabel, placeholder } = productsContent.stock;

  return (
    <label className="inline-flex h-9 cursor-text items-center gap-2 rounded-full border-[1.5px] border-line bg-surface pr-1.5 pl-3.5 text-sm font-semibold text-ink-soft focus-within:border-teal focus-within:ring-3 focus-within:ring-ring/30">
      {label}
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(event) => setText(event.target.value)}
        className="h-7 w-16 rounded-full bg-wheat px-2 text-center text-ink outline-none"
      />
    </label>
  );
};
