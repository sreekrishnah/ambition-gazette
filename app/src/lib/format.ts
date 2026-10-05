/** Date helpers for ISO timestamps from the API. Returns null for missing or invalid input. */

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function monthShort(iso: string | null | undefined): string | null {
  const date = parse(iso);
  return date ? date.toLocaleDateString("en-GB", { month: "short" }) : null;
}

export function dayOfMonth(iso: string | null | undefined): string | null {
  const date = parse(iso);
  return date ? String(date.getDate()).padStart(2, "0") : null;
}

// Briefing days are IST calendar dates (YYYY-MM-DD); noon UTC keeps the same date in every time zone.
function calendarDay(date: string): Date | null {
  return parse(`${date}T12:00:00Z`);
}

export function istToday(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function dayParts(date: string): { day: string; month: string; weekday: string } {
  const value = calendarDay(date);
  if (!value) return { day: "", month: "", weekday: "" };
  const part = (options: Intl.DateTimeFormatOptions) => value.toLocaleDateString("en-GB", { ...options, timeZone: "UTC" });
  return { day: part({ day: "2-digit" }), month: part({ month: "short" }), weekday: part({ weekday: "short" }) };
}

/** A short heading for a history entry: a day, the week starting on a Monday, a month, or a year. */
export function periodLabel(period: "day" | "week" | "month" | "year", start: string): string {
  const value = calendarDay(start);
  if (!value) return start;
  const fmt = (options: Intl.DateTimeFormatOptions) => value.toLocaleDateString("en-GB", { ...options, timeZone: "UTC" });
  if (period === "day") return fmt({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (period === "week") return `Week of ${fmt({ day: "numeric", month: "long" })}`;
  if (period === "month") return fmt({ month: "long", year: "numeric" });
  return fmt({ year: "numeric" });
}

export function longCalendarDate(date: string): string {
  const value = calendarDay(date);
  return value
    ? value.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    : date;
}

export function longDate(iso: string | null | undefined): string | null {
  const date = parse(iso);
  return date
    ? date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : null;
}
