import type { StateStorage } from "zustand/middleware";

/**
 * `localStorage` that never throws. A full, blocked or missing storage (Safari private mode, a
 * disabled setting, the server) leaves the cart working in memory for the visit instead of
 * breaking the click that changed it.
 */
export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Nothing to do: the next change tries again.
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Same as above.
    }
  },
};
