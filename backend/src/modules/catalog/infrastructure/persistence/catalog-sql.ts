import { type SQL, sql } from "drizzle-orm";
import {
  containsPattern,
  prefixPattern,
} from "../../../../shared/infrastructure/database/like-pattern.js";

/**
 * The categories the store shows: reached from a root through active, current categories
 * only, so a hidden one hides its whole branch and one in a loop is never reached.
 */
export const VISIBLE_CATEGORIES = sql`
  visible_categories AS (
    SELECT id, parent_id FROM libreria.categories
    WHERE parent_id IS NULL AND is_active AND deleted_at IS NULL
    UNION
    SELECT child.id, child.parent_id
    FROM libreria.categories child
    JOIN visible_categories parent ON child.parent_id = parent.id
    WHERE child.is_active AND child.deleted_at IS NULL
  )`;

/** Case and accents never change a match, so "lapiz" finds "Lápiz". */
export const unaccentedLike = (column: SQL, pattern: string): SQL =>
  sql`libreria.immutable_unaccent(${column}) ILIKE libreria.immutable_unaccent(${pattern})`;

/** A name to sort by, where case and accents do not change the order, as in the store tree. */
export const sortableName = (column: SQL): SQL =>
  sql`lower(libreria.immutable_unaccent(${column}))`;

/** Every word appears somewhere in the column, in any order; no words matches everything. */
export function matchesEveryWord(column: SQL, words: readonly string[]): SQL {
  if (words.length === 0) {
    return sql`true`;
  }
  return sql`(${sql.join(
    words.map((word) => unaccentedLike(column, containsPattern(word))),
    sql` AND `,
  )})`;
}

/**
 * Whether the column starts with the whole text, to list those matches first. Its spaces are
 * collapsed like the text's, so a doubled one in a stored title does not hide the match.
 */
export function startsWithText(column: SQL, text: string): SQL {
  return unaccentedLike(sql`regexp_replace(${column}, '\\s+', ' ', 'g')`, prefixPattern(text));
}
