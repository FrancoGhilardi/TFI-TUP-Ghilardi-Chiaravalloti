import { type RefObject, useEffect, useRef } from "react";

// Set on the button that takes an image off (`ImageRowButtons`), to find the one left in its place.
const REMOVE_IMAGE_BUTTON = "[data-image-remove]";

/**
 * Where the focus goes once an image is taken off: its button (and the dialog that confirmed it)
 * is gone, so it would fall to the page. It goes to the button that takes off the image now in
 * that place or, when there is none or it cannot be used, to `fallback`. Returns what to call
 * as the image is taken off; nothing moves until the list really has one image less.
 */
export function useFocusAfterRemoval(
  list: RefObject<HTMLElement | null>,
  fallback: RefObject<HTMLElement | null>,
  count: number,
): (index: number) => void {
  const removed = useRef<{ index: number; count: number } | null>(null);

  useEffect(() => {
    const pending = removed.current;
    if (!pending || count === pending.count) {
      return;
    }
    removed.current = null;
    if (count > pending.count) {
      return;
    }
    const buttons = list.current?.querySelectorAll<HTMLButtonElement>(REMOVE_IMAGE_BUTTON);
    const next = buttons?.[Math.min(pending.index, buttons.length - 1)];
    (next && !next.disabled ? next : fallback.current)?.focus();
  }, [count, list, fallback]);

  return (index) => {
    removed.current = { index, count };
  };
}
