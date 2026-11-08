/** Up to two capitals from a person's name, for their avatar. */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0].toUpperCase())
    .join("");
}

/** The first word of a person's name, to greet them. */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}
