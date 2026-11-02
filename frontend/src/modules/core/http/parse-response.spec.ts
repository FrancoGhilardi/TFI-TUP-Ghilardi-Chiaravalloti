import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ApiError } from "./api-error";
import { parseResponse } from "./parse-response";

const schema = z.array(z.object({ id: z.string() }));

describe("parseResponse", () => {
  it("returns the body when it has the expected shape", () => {
    expect(parseResponse(schema, [{ id: "1", extra: true }])).toEqual([{ id: "1" }]);
  });

  it.each([
    ["a paged object", { items: [] }],
    ["an item without its id", [{}]],
    ["nothing", undefined],
  ])("reports %s as an unexpected response", (_name, body) => {
    const error = (() => {
      try {
        parseResponse(schema, body);
      } catch (caught) {
        return caught;
      }
    })();

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });
});
