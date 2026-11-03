import { describe, expect, it } from "vitest";

import { summarize } from "./summarize";

describe("summarize", () => {
  it("keeps a short text, with its whitespace collapsed", () => {
    expect(summarize("  Tapa dura\n  y hojas  rayadas. ")).toBe("Tapa dura y hojas rayadas.");
  });

  it("cuts a long text at a word boundary and adds an ellipsis", () => {
    const text = "palabra ".repeat(40);

    const result = summarize(text, 30);

    expect(result).toBe("palabra palabra palabra…");
    expect(result.length).toBeLessThanOrEqual(30);
  });

  it("does not leave punctuation before the ellipsis", () => {
    expect(summarize("Uno, dos, tres, cuatro, cinco.", 18)).toBe("Uno, dos, tres…");
  });

  it("never leaves an emoji in half", () => {
    const result = summarize("🌼".repeat(20), 10);

    expect(result).toBe(`${"🌼".repeat(9)}…`);
  });

  it("cuts in the middle of a word when there is no earlier boundary", () => {
    expect(summarize("a".repeat(50), 10)).toBe(`${"a".repeat(9)}…`);
  });
});
