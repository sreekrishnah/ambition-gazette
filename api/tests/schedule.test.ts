import { describe, expect, it } from 'vitest';
import { batchSlot, isCatchUpWindow, isScheduledMinute } from '../src/services/schedule';

// 06:00 IST is 00:30 UTC.
describe('schedule', () => {
  it('fires only in the minute that starts at 06:00 India time', () => {
    expect(isScheduledMinute(new Date('2026-10-04T00:30:00Z'))).toBe(true);
    expect(isScheduledMinute(new Date('2026-10-04T00:30:59Z'))).toBe(true);
    expect(isScheduledMinute(new Date('2026-10-04T00:29:59Z'))).toBe(false);
    expect(isScheduledMinute(new Date('2026-10-04T00:31:00Z'))).toBe(false);
    expect(isScheduledMinute(new Date('2026-10-04T06:00:00Z'))).toBe(false);
  });

  it('allows a catch-up only between 06:00 and 09:00 India time', () => {
    expect(isCatchUpWindow(new Date('2026-10-04T00:30:00Z'))).toBe(true);
    expect(isCatchUpWindow(new Date('2026-10-04T03:00:00Z'))).toBe(true);
    expect(isCatchUpWindow(new Date('2026-10-04T03:30:00Z'))).toBe(false);
    expect(isCatchUpWindow(new Date('2026-10-04T00:00:00Z'))).toBe(false);
  });

  it('uses one slot per India day, including just before and after midnight there', () => {
    const morning = batchSlot(new Date('2026-10-04T05:00:00Z')).toISOString();
    expect(morning).toBe('2026-10-04T00:30:00.000Z');
    expect(batchSlot(new Date('2026-10-04T23:00:00Z')).toISOString()).toBe('2026-10-05T00:30:00.000Z');
    // 05:40 IST on the 4th is still the 4th in India, so it shares that day's slot.
    expect(batchSlot(new Date('2026-10-04T00:10:00Z')).toISOString()).toBe('2026-10-04T00:30:00.000Z');
    expect(batchSlot(new Date('2026-10-03T18:29:00Z')).toISOString()).toBe('2026-10-03T00:30:00.000Z');
  });
});
