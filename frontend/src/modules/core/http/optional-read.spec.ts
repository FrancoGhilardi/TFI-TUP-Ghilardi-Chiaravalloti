import { describe, expect, it } from "vitest";

import { ApiError } from "./api-error";
import { recoverFromApiError } from "./optional-read";

describe("recoverFromApiError", () => {
  it("returns what the read returns", async () => {
    await expect(recoverFromApiError(async () => [1, 2], [])).resolves.toEqual([1, 2]);
  });

  it("returns the fallback when the API fails", async () => {
    const read = async () => {
      throw new ApiError({ status: 0, code: "TIMEOUT", message: "Tardó demasiado." });
    };

    await expect(recoverFromApiError(read, [])).resolves.toEqual([]);
  });

  it("rethrows any other error", async () => {
    const bug = new TypeError("boom");

    await expect(
      recoverFromApiError(async () => {
        throw bug;
      }, []),
    ).rejects.toBe(bug);
  });
});
