const MAX_BADGE_COUNT = 9;

/** Text of the cart badge, or `null` when there is nothing to show. */
export function cartBadgeText(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);
}

/** Accessible name of the cart button, with the exact count the badge may abbreviate. */
export function cartButtonLabel(count: number): string {
  if (count <= 0) {
    return "Abrir carrito";
  }
  return `Abrir carrito, ${count} ${count === 1 ? "producto" : "productos"}`;
}
