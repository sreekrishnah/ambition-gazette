export type Period = 'day' | 'week' | 'month' | 'year';

export interface Bucket {
  period: Period;
  // First calendar day of the bucket (YYYY-MM-DD): the day itself, the Monday, the 1st of the month, or 1 January.
  start: string;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** The IST calendar date (YYYY-MM-DD) of an instant. */
export function istDay(at: Date): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function mondayOf(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - sinceMonday * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Where a day belongs in the cumulative history: days of the current week stay single days; earlier weeks of the
 * current month are one entry per week; earlier months of the current year are one entry per month; earlier years
 * are one entry per year. A week is never split, so it is placed by its Monday.
 */
export function bucketFor(day: string, today: string): Bucket {
  const weekStart = mondayOf(day);
  if (weekStart >= mondayOf(today)) return { period: 'day', start: day };
  if (weekStart.slice(0, 7) === today.slice(0, 7)) return { period: 'week', start: weekStart };
  if (weekStart.slice(0, 4) === today.slice(0, 4)) return { period: 'month', start: `${weekStart.slice(0, 7)}-01` };
  return { period: 'year', start: `${weekStart.slice(0, 4)}-01-01` };
}

export function bucketKey(bucket: Bucket): string {
  return `${bucket.period}:${bucket.start}`;
}
