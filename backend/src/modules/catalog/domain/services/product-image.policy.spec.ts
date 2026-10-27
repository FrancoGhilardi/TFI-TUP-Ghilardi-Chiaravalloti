import { InvalidImageCountError } from "../errors/invalid-image-count-error.js";
import { ProductImagePolicy } from "./product-image.policy.js";

describe("ProductImagePolicy", () => {
  const policy = new ProductImagePolicy();

  it.each([
    [0, 1],
    [0, 5],
    [4, 1],
  ])("lets %i images take %i more", (current, incoming) => {
    expect(() => policy.assertCanAdd(current, incoming)).not.toThrow();
  });

  it.each([
    [0, 0],
    [0, 6],
    [5, 1],
    [3, 3],
  ])("refuses %i images taking %i more", (current, incoming) => {
    expect(() => policy.assertCanAdd(current, incoming)).toThrow(InvalidImageCountError);
  });
});
