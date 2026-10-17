import { Entity } from "./entity.js";

class Thing extends Entity {
  constructor(
    id: string,
    readonly label: string,
  ) {
    super(id);
  }
}

class OtherThing extends Entity {
  constructor(id: string) {
    super(id);
  }
}

describe("Entity", () => {
  it("exposes its id", () => {
    expect(new Thing("a", "first").getId()).toBe("a");
  });

  it("is equal to another entity of the same type with the same id", () => {
    expect(new Thing("a", "first").equals(new Thing("a", "changed"))).toBe(true);
  });

  it("is not equal to an entity with a different id", () => {
    expect(new Thing("a", "first").equals(new Thing("b", "first"))).toBe(false);
  });

  it("is not equal to an entity of another type with the same id", () => {
    expect(new Thing("a", "first").equals(new OtherThing("a"))).toBe(false);
  });
});
