import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/modules/core/ui/primitives/button";

import { cartContent } from "../content/cart";

interface ClearCartButtonProps {
  onConfirm: () => void;
}

/** Empties the cart only after a second click, since one mis-tap would lose what was picked. */
export const ClearCartButton = ({ onConfirm }: ClearCartButtonProps) => {
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelled = useRef(false);
  const questionId = useId();
  const { clear, confirmClear, confirmYes, confirmNo } = cartContent.drawer;

  // The button that had the focus is gone once the question closes, so it goes back to the first.
  useEffect(() => {
    if (!confirming && cancelled.current) {
      cancelled.current = false;
      triggerRef.current?.focus();
    }
  }, [confirming]);

  if (!confirming) {
    return (
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        onClick={() => setConfirming(true)}
        className="h-10"
      >
        {clear}
      </Button>
    );
  }
  return (
    <div role="group" aria-labelledby={questionId} className="flex flex-col gap-2">
      <p id={questionId} className="text-center text-sm font-semibold text-ink">
        {confirmClear}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          autoFocus
          onClick={() => {
            cancelled.current = true;
            setConfirming(false);
          }}
          className="h-10 flex-1"
        >
          {confirmNo}
        </Button>
        <Button type="button" onClick={onConfirm} className="h-10 flex-1">
          {confirmYes}
        </Button>
      </div>
    </div>
  );
};
