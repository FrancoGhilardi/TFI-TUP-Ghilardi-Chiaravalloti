import { describe, expect, it } from "vitest";

import { parsePublicConfig } from "./env";

describe("parsePublicConfig", () => {
  it("builds the API base URL from the variable", () => {
    expect(parsePublicConfig({ NEXT_PUBLIC_API_URL: "http://localhost:3001" })).toEqual({
      apiBaseUrl: "http://localhost:3001/api/v1",
    });
  });

  it.each([
    "https://api.example.com/",
    "https://api.example.com/api/v1",
    "https://api.example.com/x/",
  ])("keeps only the origin of %s", (url) => {
    expect(parsePublicConfig({ NEXT_PUBLIC_API_URL: url }).apiBaseUrl).toBe(
      "https://api.example.com/api/v1",
    );
  });

  it.each([undefined, "", "localhost:3001", "not a url", "ftp://api.example.com"])(
    "rejects %s naming the variable",
    (value) => {
      expect(() => parsePublicConfig({ NEXT_PUBLIC_API_URL: value })).toThrow(
        /NEXT_PUBLIC_API_URL/,
      );
    },
  );
});
