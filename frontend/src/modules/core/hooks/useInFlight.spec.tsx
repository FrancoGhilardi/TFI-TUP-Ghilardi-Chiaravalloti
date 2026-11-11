import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useInFlight } from "./useInFlight";

const deferred = () => {
  let finish: () => void = () => {};
  const promise = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return { promise, finish };
};

describe("useInFlight", () => {
  it("marks an item as pending while its task runs", async () => {
    const { promise, finish } = deferred();
    const { result } = renderHook(() => useInFlight());

    act(() => {
      void result.current.run("a", () => promise);
    });
    expect(result.current.isPending("a")).toBe(true);
    expect(result.current.isPending("b")).toBe(false);

    await act(async () => finish());
    expect(result.current.isPending("a")).toBe(false);
  });

  it("ignores a second task for the same item while the first is on its way", async () => {
    const { promise, finish } = deferred();
    const task = vi.fn(() => promise);
    const { result } = renderHook(() => useInFlight());

    act(() => {
      void result.current.run("a", task);
      void result.current.run("a", task);
    });
    await act(async () => finish());

    expect(task).toHaveBeenCalledTimes(1);
  });

  it("lets other items run at the same time", async () => {
    const task = vi.fn(async () => {});
    const { result } = renderHook(() => useInFlight());

    await act(async () => {
      await Promise.all([result.current.run("a", task), result.current.run("b", task)]);
    });

    expect(task).toHaveBeenCalledTimes(2);
  });

  it("frees the item when the task fails, and lets the failure through", async () => {
    const { result } = renderHook(() => useInFlight());

    await act(async () => {
      await expect(
        result.current.run("a", () => Promise.reject(new Error("boom"))),
      ).rejects.toThrow("boom");
    });

    expect(result.current.isPending("a")).toBe(false);
  });

  it("can run an item again once it finished", async () => {
    const task = vi.fn(async () => {});
    const { result } = renderHook(() => useInFlight());

    await act(() => result.current.run("a", task));
    await act(() => result.current.run("a", task));

    expect(task).toHaveBeenCalledTimes(2);
  });
});
