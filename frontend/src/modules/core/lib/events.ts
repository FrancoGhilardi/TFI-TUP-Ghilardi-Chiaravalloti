import type { MouseEvent } from "react";

/**
 * An `onClick` that runs `callback` only for an ordinary left click. A modified click (Ctrl, Cmd,
 * Shift, Alt) or a middle click opens the link elsewhere, and the page that holds it stays.
 */
export function whenPlainClick(callback: () => void) {
  return (event: MouseEvent) => {
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (event.button === 0 && !modified) {
      callback();
    }
  };
}
