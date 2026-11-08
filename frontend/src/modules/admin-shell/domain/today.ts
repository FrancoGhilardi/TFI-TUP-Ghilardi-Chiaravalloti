const longDate = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** The day as the welcome line writes it, such as `domingo, 8 de noviembre`. */
export function formatToday(now: Date): string {
  return longDate.format(now);
}
