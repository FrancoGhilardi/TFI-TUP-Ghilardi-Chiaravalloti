import { describe, expect, it } from "vitest";

import { checkImageFile, dropMove, MAX_IMAGE_BYTES, moveItem } from "./image-rules";

describe("checkImageFile", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("takes %s", (type) => {
    expect(checkImageFile({ type, size: 1000 })).toEqual({ ok: true });
  });

  it.each(["image/gif", "image/svg+xml", "application/pdf", ""])("refuses the type %j", (type) => {
    expect(checkImageFile({ type, size: 1000 })).toEqual({ ok: false, reason: "type" });
  });

  it("takes exactly 10 MB and refuses a byte more", () => {
    expect(checkImageFile({ type: "image/png", size: MAX_IMAGE_BYTES })).toEqual({ ok: true });
    expect(checkImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toEqual({
      ok: false,
      reason: "size",
    });
  });
});

describe("moveItem", () => {
  it("moves an item forward and backward", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("does not change the list it was given", () => {
    const original = ["a", "b"];

    moveItem(original, 0, 1);

    expect(original).toEqual(["a", "b"]);
  });

  it.each([
    [0, 0],
    [-1, 1],
    [1, -1],
    [5, 0],
    [0, 5],
  ])("leaves the order alone for a move from %i to %i", (from, to) => {
    expect(moveItem(["a", "b"], from, to)).toEqual(["a", "b"]);
  });
});

describe("dropMove", () => {
  const ids = ["a", "b", "c", "d"];

  it("tells where the dragged item was and where it was dropped", () => {
    expect(dropMove(ids, "a", "c")).toEqual({ from: 0, to: 2 });
    expect(dropMove(ids, "d", "b")).toEqual({ from: 3, to: 1 });
  });

  it.each([
    ["a", "a"],
    ["a", undefined],
    ["x", "b"],
    ["a", "x"],
  ])("says nothing moved for %s dropped on %s", (active, over) => {
    expect(dropMove(ids, active, over)).toBeUndefined();
  });
});
