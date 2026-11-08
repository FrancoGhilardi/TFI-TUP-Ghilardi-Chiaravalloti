import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedInput } from "./useDebouncedInput";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const setup = (initial = "") => {
  const onCommit = vi.fn();
  const hook = renderHook(({ value }) => useDebouncedInput(value, onCommit, 300), {
    initialProps: { value: initial },
  });
  return { onCommit, ...hook };
};

describe("useDebouncedInput", () => {
  it("starts with the value and reports nothing", () => {
    const { result, onCommit } = setup("lapiz");

    act(() => vi.advanceTimersByTime(1000));

    expect(result.current[0]).toBe("lapiz");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("reports what was typed once, after the pause", () => {
    const { result, onCommit } = setup();

    act(() => result.current[1]("r"));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current[1]("re"));
    act(() => vi.advanceTimersByTime(200));
    expect(onCommit).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(100));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("re");
  });

  it("reports the text without its surrounding spaces", () => {
    const { result, onCommit } = setup();

    act(() => result.current[1]("  regla  "));
    act(() => vi.advanceTimersByTime(300));

    expect(onCommit).toHaveBeenCalledWith("regla");
  });

  it("reports an empty text when the field is cleared", () => {
    const { result, onCommit } = setup("regla");

    act(() => result.current[1](""));
    act(() => vi.advanceTimersByTime(300));

    expect(onCommit).toHaveBeenCalledWith("");
  });

  it("does not report a text that only differs by spaces from the value", () => {
    const { result, onCommit } = setup("regla");

    act(() => result.current[1]("regla "));
    act(() => vi.advanceTimersByTime(300));

    expect(onCommit).not.toHaveBeenCalled();
  });

  it("follows the value when it changes by other means, without reporting it back", () => {
    const { result, onCommit, rerender } = setup("regla");

    rerender({ value: "" });
    act(() => vi.advanceTimersByTime(1000));

    expect(result.current[0]).toBe("");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("does not bring back what was typed when the value is cleared before the pause ends", () => {
    const { result, onCommit, rerender } = setup("regla");

    act(() => result.current[1]("reglas"));
    rerender({ value: "" });
    act(() => vi.advanceTimersByTime(1000));

    expect(result.current[0]).toBe("");
    expect(onCommit).not.toHaveBeenCalledWith("reglas");
  });

  it("reports a text the value does not take only once, however many times it renders", () => {
    const { result, onCommit, rerender } = setup();

    act(() => result.current[1]("99999999999"));
    act(() => vi.advanceTimersByTime(300));
    rerender({ value: "" });
    rerender({ value: "" });
    act(() => vi.advanceTimersByTime(1000));

    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("reports a text the value turns into another one only once", () => {
    const { result, onCommit, rerender } = setup();

    act(() => result.current[1]("007"));
    act(() => vi.advanceTimersByTime(300));
    rerender({ value: "7" });
    act(() => vi.advanceTimersByTime(1000));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("007");
  });

  it("reports again what was reported before once the person changes it", () => {
    const { result, onCommit, rerender } = setup();

    act(() => result.current[1]("regla"));
    act(() => vi.advanceTimersByTime(300));
    rerender({ value: "regla" });
    act(() => result.current[1](""));
    act(() => vi.advanceTimersByTime(300));
    rerender({ value: "" });
    act(() => result.current[1]("regla"));
    act(() => vi.advanceTimersByTime(300));

    expect(onCommit.mock.calls.map(([text]) => text)).toEqual(["regla", "", "regla"]);
  });
});
