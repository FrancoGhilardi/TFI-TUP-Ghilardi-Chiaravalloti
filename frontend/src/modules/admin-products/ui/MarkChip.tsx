import type { ReactNode } from "react";

import { cn } from "@/modules/core/lib/utils";

interface MarkChipProps {
  pressed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** A filter that is either on or off. */
export const MarkChip = ({ pressed, onToggle, children }: MarkChipProps) => {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        "inline-flex h-9 items-center rounded-full border-[1.5px] px-3.5 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        pressed
          ? "border-teal bg-teal-soft text-teal-deep"
          : "border-line bg-surface text-ink-soft hover:bg-wheat",
      )}
    >
      {children}
    </button>
  );
};
