import { describe, expect, it } from "vitest";

import { abortable } from "./abortable";

const never = () => new Promise<never>(() => undefined);

describe("abortable", () => {
  it("resolves with the operation's result", async () => {
    await expect(abortable(() => 42, new AbortController().signal)).resolves.toBe(42);
  });

  it("rejects with the operation's error, thrown or rejected", async () => {
    const error = new Error("boom");
    const { signal } = new AbortController();

    await expect(
      abortable(() => {
        throw error;
      }, signal),
    ).rejects.toBe(error);
    await expect(abortable(() => Promise.reject(error), signal)).rejects.toBe(error);
  });

  it("rejects with the reason when the signal aborts first", async () => {
    const controller = new AbortController();
    const reason = new Error("stop");

    const result = abortable(never, controller.signal);
    controller.abort(reason);

    await expect(result).rejects.toBe(reason);
  });

  it("does not run the operation on an aborted signal", async () => {
    let ran = false;

    const result = abortable(() => {
      ran = true;
    }, AbortSignal.abort());

    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(ran).toBe(false);
  });
});
