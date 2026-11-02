import { Slug } from "../domain/value-objects/slug.js";

/** Where the slugs of a table live. */
export interface SlugStore {
  /** Whether any record, deleted or not, has that slug. */
  exists(slug: Slug): Promise<boolean>;
  /**
   * Makes another creation that tries the same slug wait until this transaction ends, so it
   * then sees this record and moves on to the next suffix.
   */
  lock(slug: Slug): Promise<void>;
}

/** The store of a repository that checks and locks slugs. */
export const slugStoreOf = (repository: {
  existsBySlug(slug: Slug): Promise<boolean>;
  lockSlug(slug: Slug): Promise<void>;
}): SlugStore => ({
  exists: (slug) => repository.existsBySlug(slug),
  lock: (slug) => repository.lockSlug(slug),
});

/**
 * A slug made from the text that the store does not know yet: the plain one, or the first free
 * of "-2", "-3"…, within the `maxLength` of its column. Runs inside the transaction that saves
 * the record: each candidate is locked before it is checked, so two creations at once never
 * pick the same one.
 */
export class UniqueSlugGenerator {
  async generate(text: string, store: SlugStore, maxLength: number): Promise<Slug> {
    const base = Slug.fromText(text, maxLength);
    let candidate = base;
    for (let suffix = 2; ; suffix++) {
      await store.lock(candidate);
      if (!(await store.exists(candidate))) {
        return candidate;
      }
      candidate = base.withSuffix(suffix, maxLength);
    }
  }
}
