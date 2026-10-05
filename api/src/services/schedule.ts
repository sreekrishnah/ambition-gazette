// The daily refresh runs at 06:00 India time, whatever timezone the server is in.

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
export const SCHEDULED_HOUR_IST = 6;
// A server that was down at 06:00 still runs the day's refresh when it comes back, up to this hour.
export const CATCH_UP_UNTIL_HOUR_IST = 9;

function ist(now: Date): Date {
  return new Date(now.getTime() + IST_OFFSET_MS);
}

/** True during the minute that starts at 06:00 IST. */
export function isScheduledMinute(now = new Date()): boolean {
  const t = ist(now);
  return t.getUTCHours() === SCHEDULED_HOUR_IST && t.getUTCMinutes() === 0;
}

/** True from 06:00 until the catch-up hour on the same IST day. */
export function isCatchUpWindow(now = new Date()): boolean {
  const hour = ist(now).getUTCHours();
  return hour >= SCHEDULED_HOUR_IST && hour < CATCH_UP_UNTIL_HOUR_IST;
}

/** The instant 06:00 IST of the day containing `now`, used as the batch's one-per-day slot. */
export function batchSlot(now = new Date()): Date {
  const t = ist(now);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), SCHEDULED_HOUR_IST) - IST_OFFSET_MS);
}
