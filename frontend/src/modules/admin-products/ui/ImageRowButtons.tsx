import { ArrowDown, ArrowUp, X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";

import { ConfirmDialog } from "@/modules/core/ui/ConfirmDialog";

import { productImagesText } from "../content/product-form";

const BUTTON =
  "grid size-8 place-items-center rounded-full text-ink-soft outline-none hover:bg-wheat hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40";

interface ImageRowButtonsProps {
  name: string;
  /** Place of the image in the list, to follow it with the focus when it moves. */
  index: number;
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
  index,
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
  const up = useRef<HTMLButtonElement>(null);
  const down = useRef<HTMLButtonElement>(null);
  // The arrow pressed last, while the image it moved has not been given the focus back.
  const pressed = useRef<"up" | "down" | null>(null);
  const upDisabled = disabled || movesDisabled || isFirst;
  const downDisabled = disabled || movesDisabled || isLast;

  // Moving the row, or disabling its buttons while the new order is saved, takes the focus away:
  // once the image is in its place and usable, it goes back to the same arrow, or to the other
  // one when the image reached an end.
  useEffect(() => {
    const direction = pressed.current;
    if (!direction || disabled) {
      return;
    }
    pressed.current = null;
    const [same, other] = direction === "up" ? [up, down] : [down, up];
    const target = same.current?.disabled ? other.current : same.current;
    if (target && !target.disabled) {
      target.focus();
    }
  }, [index, upDisabled, downDisabled, disabled]);

  const move = (direction: "up" | "down", onMove: () => void) => {
    pressed.current = direction;
    onMove();
  };

  const removeButton: ReactNode = (
    <button
      type="button"
      data-image-remove=""
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
        ref={up}
        type="button"
        aria-label={moveUp(name)}
        title={moveUp(name)}
        disabled={upDisabled}
        onClick={() => move("up", onUp)}
        className={BUTTON}
      >
        <ArrowUp className="size-4" aria-hidden="true" />
      </button>
      <button
        ref={down}
        type="button"
        aria-label={moveDown(name)}
        title={moveDown(name)}
        disabled={downDisabled}
        onClick={() => move("down", onDown)}
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
