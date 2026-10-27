import { InvalidSlugError } from "../domain/errors/invalid-slug-error.js";
import type { Slug } from "../domain/value-objects/slug.js";
import { UniqueSlugGenerator } from "./unique-slug-generator.js";

describe("UniqueSlugGenerator", () => {
  const generator = new UniqueSlugGenerator();

  const takenAmong = (taken: string[]) => {
    const asked: string[] = [];
    const exists = (slug: Slug) => {
      asked.push(slug.toString());
      return Promise.resolve(taken.includes(slug.toString()));
    };
    return { asked, exists };
  };

  it("uses the plain slug when it is free", async () => {
    const { exists } = takenAmong([]);

    const slug = await generator.generate("Útiles Escolares", exists);

    expect(slug.toString()).toBe("utiles-escolares");
  });

  it("adds the first free suffix, trying them in order", async () => {
    const { asked, exists } = takenAmong(["cuadernos", "cuadernos-2", "cuadernos-3"]);

    const slug = await generator.generate("Cuadernos", exists);

    expect(slug.toString()).toBe("cuadernos-4");
    expect(asked).toEqual(["cuadernos", "cuadernos-2", "cuadernos-3", "cuadernos-4"]);
  });

  it("rejects a text without letters or digits, asking nothing", async () => {
    const { asked, exists } = takenAmong([]);

    await expect(generator.generate("¡¿?!", exists)).rejects.toThrow(InvalidSlugError);
    expect(asked).toEqual([]);
  });
});
