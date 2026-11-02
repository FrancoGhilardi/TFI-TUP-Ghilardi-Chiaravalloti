import { queryBoolean, queryInteger } from "./query-transforms.js";

describe("queryBoolean", () => {
  it.each([
    ["true", true],
    ["false", false],
    ["yes", "yes"],
    ["1", "1"],
    [undefined, undefined],
  ])("reads %o as %o", (value, read) => {
    expect(queryBoolean({ value })).toBe(read);
  });
});

describe("queryInteger", () => {
  it.each([
    ["3", 3],
    ["2.5", 2.5],
    ["", undefined],
    ["  ", undefined],
    [undefined, undefined],
  ])("reads %o as %o", (value, read) => {
    expect(queryInteger({ value })).toBe(read);
  });

  it("leaves text that is no number to be refused", () => {
    expect(queryInteger({ value: "cinco" })).toBeNaN();
  });
});
