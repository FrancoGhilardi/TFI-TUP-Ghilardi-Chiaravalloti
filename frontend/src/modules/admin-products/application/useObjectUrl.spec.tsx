import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useObjectUrl } from "./useObjectUrl";

const create = vi.fn();
const revoke = vi.fn();

beforeEach(() => {
  create.mockReset();
  revoke.mockReset();
  create.mockImplementation((file: File) => `blob:${file.name}`);
  URL.createObjectURL = create;
  URL.revokeObjectURL = revoke;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const png = (name: string) => new File(["x"], name, { type: "image/png" });

describe("useObjectUrl", () => {
  it("gives a link to show the file", () => {
    const file = png("a.png");

    const { result } = renderHook(() => useObjectUrl(file));

    expect(result.current).toBe("blob:a.png");
  });

  it("gives nothing without a file", () => {
    const { result } = renderHook(() => useObjectUrl(undefined));

    expect(result.current).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });

  it("makes one link per file, however many times it renders", () => {
    const file = png("a.png");

    const { rerender } = renderHook(() => useObjectUrl(file));
    rerender();
    rerender();

    expect(create).toHaveBeenCalledTimes(1);
  });

  it("lets the link go when nothing shows the file any more", () => {
    const file = png("a.png");
    const { unmount } = renderHook(() => useObjectUrl(file));

    unmount();

    expect(revoke).toHaveBeenCalledWith("blob:a.png");
  });

  it("follows the file when it is replaced", () => {
    const first = png("a.png");
    const second = png("b.png");
    const { result, rerender } = renderHook(({ file }) => useObjectUrl(file), {
      initialProps: { file: first },
    });

    rerender({ file: second });

    expect(result.current).toBe("blob:b.png");
    expect(revoke).toHaveBeenCalledWith("blob:a.png");
  });
});
