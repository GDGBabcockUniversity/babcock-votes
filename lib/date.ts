/** Parse a Convex timestamp (ms), a Date, an ISO string, or a legacy `{ seconds }` value. */
export const toDate = (
  value: string | number | Date | { seconds: number } | null | undefined,
): Date | null => {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object") return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatShortDate = (
  value: Parameters<typeof toDate>[0],
  locale = "en-US",
) =>
  toDate(value)?.toLocaleDateString(locale, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }) ?? "";

export const formatFullDateTime = (
  value: Parameters<typeof toDate>[0],
  locale = "en-US",
) => {
  const d = toDate(value);
  if (!d) return "";
  return d.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};
