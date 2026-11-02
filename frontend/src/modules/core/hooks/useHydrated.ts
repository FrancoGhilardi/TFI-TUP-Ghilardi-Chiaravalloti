"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` in the server render and until the page is interactive, `true` afterwards. Lets a
 * component keep a fallback for visitors without JavaScript (a submit button) and drop it once
 * scripts run.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
