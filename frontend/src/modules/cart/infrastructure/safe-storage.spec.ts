import { afterEach, describe, expect, it, vi } from "vitest";

import { safeLocalStorage } from "./safe-storage";

describe("safeLocalStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores and reads like the browser storage", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    });

    safeLocalStorage.setItem("k", "v");
    expect(safeLocalStorage.getItem("k")).toBe("v");
    safeLocalStorage.removeItem("k");
    expect(safeLocalStorage.getItem("k")).toBeNull();
  });

  it("never throws when the storage does, as with a full quota", () => {
    const failing = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    vi.stubGlobal("localStorage", {
      getItem: failing,
      setItem: failing,
      removeItem: failing,
    });

    expect(() => safeLocalStorage.setItem("k", "v")).not.toThrow();
    expect(() => safeLocalStorage.removeItem("k")).not.toThrow();
    expect(safeLocalStorage.getItem("k")).toBeNull();
  });

  it("reads nothing where there is no storage at all, as on the server", () => {
    vi.stubGlobal("localStorage", undefined);

    expect(safeLocalStorage.getItem("k")).toBeNull();
  });
});
