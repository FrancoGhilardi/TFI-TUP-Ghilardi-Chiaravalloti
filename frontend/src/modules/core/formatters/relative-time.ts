const relativeTime = new Intl.RelativeTimeFormat("es-AR", { numeric: "always" });

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Largest first: the first unit the elapsed time reaches is the one it is told in. */
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * DAY],
  ["month", 30 * DAY],
  ["day", DAY],
  ["hour", HOUR],
  ["minute", MINUTE],
];

/**
 * How long ago `date` was, in words (`hace 5 minutos`, `hace 2 días`). Under a minute, or a date
 * ahead of `now` because the clocks differ, it is `hace instantes`.
 */
export function formatRelativeTime(date: Date, now: Date): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  for (const [unit, size] of UNITS) {
    if (seconds >= size) {
      return relativeTime.format(-Math.floor(seconds / size), unit);
    }
  }
  return "hace instantes";
}
