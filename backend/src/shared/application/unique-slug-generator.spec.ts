import { InvalidSlugError } from "../domain/errors/invalid-slug-error.js";
import type { Slug } from "../domain/value-objects/slug.js";
import { type SlugStore, UniqueSlugGenerator } from "./unique-slug-generator.js";

describe("UniqueSlugGenerator", () => {
  const generator = new UniqueSlugGenerator();

  const takenAmong = (taken: string[]) => {
    const asked: string[] = [];
    const store: SlugStore = {
      lock: (slug: Slug) => {
        asked.push(`lock ${slug.toString()}`);
        return Promise.resolve();
      },
      exists: (slug: Slug) => {
        asked.push(`exists ${slug.toString()}`);
        return Promise.resolve(taken.includes(slug.toString()));
      },
    };
    return { asked, store };
  };

  it("uses the plain slug when it is free", async () => {
    const { store } = takenAmong([]);

    const slug = await generator.generate("Útiles Escolares", store, 220);

    expect(slug.toString()).toBe("utiles-escolares");
  });

  it("adds the first free suffix, locking each candidate before checking it", async () => {
    const { asked, store } = takenAmong(["cuadernos", "cuadernos-2"]);

    const slug = await generator.generate("Cuadernos", store, 220);

    expect(slug.toString()).toBe("cuadernos-3");
    expect(asked).toEqual([
      "lock cuadernos",
      "exists cuadernos",
      "lock cuadernos-2",
      "exists cuadernos-2",
      "lock cuadernos-3",
      "exists cuadernos-3",
    ]);
  });

  it("keeps every candidate within the limit, cutting the text", async () => {
    const { store } = takenAmong(["cuaderno"]);

    const slug = await generator.generate("Cuaderno Rayado", store, 10);

    expect(slug.toString()).toBe("cuaderno-2");
  });

  it("rejects a text without letters or digits, asking nothing", async () => {
    const { asked, store } = takenAmong([]);

    await expect(generator.generate("¡¿?!", store, 220)).rejects.toThrow(InvalidSlugError);
    expect(asked).toEqual([]);
  });
});
