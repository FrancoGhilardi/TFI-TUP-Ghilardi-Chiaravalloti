import { containsPattern } from "./like-pattern.js";

describe("containsPattern", () => {
  it("finds the text anywhere", () => {
    expect(containsPattern("ana")).toBe("%ana%");
  });

  it("escapes the wildcards and the escape character", () => {
    expect(containsPattern("50%_a\\b")).toBe("%50\\%\\_a\\\\b%");
  });
});
