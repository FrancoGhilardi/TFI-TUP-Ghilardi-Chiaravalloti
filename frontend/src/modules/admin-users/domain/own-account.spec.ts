import { describe, expect, it } from "vitest";

import { isOwnAccount } from "./own-account";

describe("isOwnAccount", () => {
  it("is true for the signed-in user", () => {
    expect(isOwnAccount("u1", "u1")).toBe(true);
  });

  it("is false for another user", () => {
    expect(isOwnAccount("u1", "u2")).toBe(false);
  });

  it.each([null, undefined])("is false when nobody is signed in (%s)", (sessionUserId) => {
    expect(isOwnAccount(sessionUserId, "u1")).toBe(false);
  });
});
