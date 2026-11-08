export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** The API takes images of up to 10 MB. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES = 5;
export const MAX_ALT_TEXT_LENGTH = 255;

export type ImageCheck = { ok: true } | { ok: false; reason: "type" | "size" };

/** Whether a picked file is one the API will take; the API itself looks at the real content. */
export function checkImageFile({ type, size }: { type: string; size: number }): ImageCheck {
  if (!(IMAGE_TYPES as readonly string[]).includes(type)) {
    return { ok: false, reason: "type" };
  }
  return size > MAX_IMAGE_BYTES ? { ok: false, reason: "size" } : { ok: true };
}

/** Where the dragged item goes: its position and the one it was dropped on, or nothing if it did not move. */
export function dropMove(
  ids: readonly string[],
  activeId: string,
  overId: string | undefined,
): { from: number; to: number } | undefined {
  const from = ids.indexOf(activeId);
  const to = overId === undefined ? -1 : ids.indexOf(overId);
  return from < 0 || to < 0 || from === to ? undefined : { from, to };
}

/** A copy of `items` with the one at `from` moved to `to`; out-of-range moves change nothing. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const moved = [...items];
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return moved;
  }
  const [item] = moved.splice(from, 1);
  moved.splice(to, 0, item);
  return moved;
}
