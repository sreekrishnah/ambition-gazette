import { describe, expect, it } from 'vitest';
import { bucketFor, istDay } from '../src/domain/periods';

// Saturday 3 October 2026; its week started on Monday 28 September.
const TODAY = '2026-10-03';

describe('bucketFor', () => {
  it('keeps the days of the current week as single days', () => {
    expect(bucketFor('2026-10-03', TODAY)).toEqual({ period: 'day', start: '2026-10-03' });
    expect(bucketFor('2026-09-29', TODAY)).toEqual({ period: 'day', start: '2026-09-29' });
  });

  it('rolls earlier weeks of the current month into one entry per week', () => {
    const today = '2026-10-21';
    expect(bucketFor('2026-10-08', today)).toEqual({ period: 'week', start: '2026-10-05' });
    expect(bucketFor('2026-10-11', today)).toEqual({ period: 'week', start: '2026-10-05' });
  });

  it('rolls earlier months of the current year into one entry per month', () => {
    expect(bucketFor('2026-09-15', TODAY)).toEqual({ period: 'month', start: '2026-09-01' });
    expect(bucketFor('2026-03-02', TODAY)).toEqual({ period: 'month', start: '2026-03-01' });
  });

  it('rolls earlier years into one entry per year', () => {
    expect(bucketFor('2025-12-30', TODAY)).toEqual({ period: 'year', start: '2025-01-01' });
  });

  it('never splits a week that straddles a month boundary', () => {
    const today = '2026-10-21';
    expect(bucketFor('2026-09-30', today)).toEqual({ period: 'month', start: '2026-09-01' });
    expect(bucketFor('2026-10-01', today)).toEqual({ period: 'month', start: '2026-09-01' });
  });
});

describe('istDay', () => {
  it('uses the IST calendar date', () => {
    expect(istDay(new Date('2026-10-02T20:00:00Z'))).toBe('2026-10-03');
  });
});
