import { ArrowDown, ArrowUp, X } from "lucide-react";
import type { ReactNode } from "react";

import { ConfirmDialog } from "@/modules/core/ui/ConfirmDialog";

import { productImagesText } from "../content/product-form";

const BUTTON =
  "grid size-8 place-items-center rounded-full text-ink-soft outline-none hover:bg-wheat hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40";

interface ImageRowButtonsProps {
  name: string;
  isFirst: boolean;
  isLast: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  disabled?: boolean;
  /** Moving is not possible for now, though the image may still be taken off. */
  movesDisabled?: boolean;
  /** The image cannot be taken off (it is the last one). */
  removeDisabled?: boolean;
  /** Asks before taking the image off, with these words. */
  confirmRemove?: { title: string; description: string; confirm: string };
}

/** The ways to move an image without dragging it, and to take it off. */
export const ImageRowButtons = ({
  name,
  isFirst,
  isLast,
  onUp,
  onDown,
  onRemove,
  disabled,
  movesDisabled,
  removeDisabled,
  confirmRemove,
}: ImageRowButtonsProps) => {
  const { moveUp, moveDown, remove } = productImagesText;
  const removeButton: ReactNode = (
    <button
      type="button"
      aria-label={remove(name)}
      title={remove(name)}
      disabled={disabled || removeDisabled}
      onClick={confirmRemove ? undefined : onRemove}
      className={BUTTON}
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-label={moveUp(name)}
        title={moveUp(name)}
        disabled={disabled || movesDisabled || isFirst}
        onClick={onUp}
        className={BUTTON}
      >
        <ArrowUp className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={moveDown(name)}
        title={moveDown(name)}
        disabled={disabled || movesDisabled || isLast}
        onClick={onDown}
        className={BUTTON}
      >
        <ArrowDown className="size-4" aria-hidden="true" />
      </button>
      {confirmRemove ? (
        <ConfirmDialog
          title={confirmRemove.title}
          description={confirmRemove.description}
          confirmLabel={confirmRemove.confirm}
          onConfirm={onRemove}
        >
          {removeButton}
        </ConfirmDialog>
      ) : (
        removeButton
      )}
    </div>
  );
};
