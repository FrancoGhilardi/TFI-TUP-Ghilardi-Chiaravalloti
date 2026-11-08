const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whether `day` is a real calendar day written as `YYYY-MM-DD`. */
export function isValidDay(day: string): boolean {
  const match = DAY.exec(day);
  if (!match) {
    return false;
  }
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(Date.UTC(year, month - 1, date));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === date
  );
}

const pad = (value: number) => String(Math.abs(value)).padStart(2, "0");

/**
 * The last minute of `day` in a zone `offsetMinutes` ahead of UTC (Argentina: -180), as the API
 * wants it: an offer or a novelty then lasts through the whole day the person chose.
 */
export function endOfDayIso(day: string, offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const hours = pad(Math.trunc(offsetMinutes / 60));
  const minutes = pad(offsetMinutes % 60);
  return `${day}T23:59:00${sign}${hours}:${minutes}`;
}

/** The calendar day that `instant` falls on in a zone `offsetMinutes` ahead of UTC. */
export function isoToDay(instant: Date, offsetMinutes: number): string {
  return new Date(instant.getTime() + offsetMinutes * 60_000).toISOString().slice(0, 10);
}

/** Whether `day` is before today: the day of `now` in the zone is still fine. */
export function isPastDay(day: string, now: Date, offsetMinutes: number): boolean {
  return day < isoToDay(now, offsetMinutes);
}

/** Minutes ahead of UTC that this machine's zone is at `day`; the only part that is not pure. */
export function localOffsetMinutes(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return -new Date(year, month - 1, date, 23, 59).getTimezoneOffset();
}

/** Minutes ahead of UTC that this machine's zone is at `instant`. */
export const instantOffsetMinutes = (instant: Date): number => -instant.getTimezoneOffset();
