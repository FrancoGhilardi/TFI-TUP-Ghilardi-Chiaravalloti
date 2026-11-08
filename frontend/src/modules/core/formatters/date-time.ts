const date = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });
const dateTime = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
  hourCycle: "h23",
});

/** A day written out, such as `8 de noviembre de 2026`. */
export const formatDate = (value: Date): string => date.format(value);

/** A day and the time, such as `8 de noviembre de 2026, 14:30`. */
export const formatDateTime = (value: Date): string => dateTime.format(value);
