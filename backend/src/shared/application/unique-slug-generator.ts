import { Slug } from "../domain/value-objects/slug.js";

export type SlugExistsFn = (slug: Slug) => Promise<boolean>;

/**
 * A slug made from the text that `exists` does not know yet: the plain one, or the first free
 * of "-2", "-3"… Two records created at once may still pick the same one; the unique
 * constraint of their table stops the second.
 */
export class UniqueSlugGenerator {
  async generate(text: string, exists: SlugExistsFn): Promise<Slug> {
    const base = Slug.fromText(text);
    let candidate = base;
    for (let suffix = 2; await exists(candidate); suffix++) {
      candidate = base.withSuffix(suffix);
    }
    return candidate;
  }
}
