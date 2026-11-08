import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

const closing = () => {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event;
};

describe("useUnsavedChangesWarning", () => {
  it("lets the page close freely while nothing is unsaved", () => {
    renderHook(() => useUnsavedChangesWarning(false));

    expect(closing().defaultPrevented).toBe(false);
  });

  it("makes the browser ask before the page closes while something is unsaved", () => {
    renderHook(() => useUnsavedChangesWarning(true));

    expect(closing().defaultPrevented).toBe(true);
  });

  it("stops asking as soon as everything is saved", () => {
    const { rerender } = renderHook(({ dirty }) => useUnsavedChangesWarning(dirty), {
      initialProps: { dirty: true },
    });

    rerender({ dirty: false });

    expect(closing().defaultPrevented).toBe(false);
  });

  it("stops asking when the screen goes away", () => {
    const { unmount } = renderHook(() => useUnsavedChangesWarning(true));

    unmount();

    expect(closing().defaultPrevented).toBe(false);
  });
});
