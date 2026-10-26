import { InvalidCategoryAssignmentError } from "../errors/invalid-category-assignment-error.js";
import { InvalidSkuError } from "../errors/invalid-sku-error.js";
import { CategoryAssignment } from "./category-assignment.js";
import { Sku } from "./sku.js";

describe("Sku", () => {
  it.each(["LMS-000001", "LMS-1000000"])("accepts %s", (value) => {
    expect(Sku.fromValue(value).toString()).toBe(value);
  });

  it.each(["LMS-00001", "lms-000001", "LMS000001", "LMS-0000a1", ""])("rejects %o", (value) => {
    expect(() => Sku.fromValue(value)).toThrow(InvalidSkuError);
  });

  it("compares by value", () => {
    expect(Sku.fromValue("LMS-000001").equals(Sku.fromValue("LMS-000001"))).toBe(true);
  });
});

describe("CategoryAssignment", () => {
  it("assigns every category, with exactly the primary one marked", () => {
    expect(CategoryAssignment.fromIds(["a", "b", "c"], "b")).toEqual([
      { categoryId: "a", isPrimary: false },
      { categoryId: "b", isPrimary: true },
      { categoryId: "c", isPrimary: false },
    ]);
  });

  it.each([
    ["no category", [], "a", "empty"],
    ["a repeated category", ["a", "b", "a"], "a", "duplicated"],
    ["a primary outside the list", ["a", "b"], "c", "primaryMissing"],
    ["no category, whatever the primary", [], "", "empty"],
  ])("refuses %s", (_label, ids, primary, reason) => {
    expect(() => CategoryAssignment.fromIds(ids, primary)).toThrow(
      new InvalidCategoryAssignmentError(reason as "empty"),
    );
  });
});
