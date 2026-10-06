import { describe, expect, it } from 'vitest';
import { Signal, deriveBelief, stateOf, storedStatus } from '../src/domain/beliefs';

const signal = (id: string, effect: Signal['effect'], recordedAt: string, publisherCount = 1): Signal => ({ developmentId: id, effect, recordedAt, publisherCount });

describe('deriveBelief', () => {
  it('is stable with no evidence', () => {
    expect(deriveBelief([], null)).toEqual({ state: 'stable', threats: 0, confirmations: 0, opportunities: 0 });
  });

  it('puts one uncorroborated threat on watch', () => {
    expect(deriveBelief([signal('d1', 'challenges', '2026-10-01T00:00:00Z')], null).state).toBe('watch');
  });

  it('asks to reconsider when a threat is reported by two publishers', () => {
    expect(deriveBelief([signal('d1', 'challenges', '2026-10-01T00:00:00Z', 2)], null).state).toBe('reconsider');
  });

  it('asks to reconsider after two separate threatening developments', () => {
    const signals = [signal('d1', 'challenges', '2026-10-01T00:00:00Z'), signal('d2', 'challenges', '2026-10-02T00:00:00Z')];
    expect(deriveBelief(signals, null)).toMatchObject({ state: 'reconsider', threats: 2 });
  });

  it('counts confirmations and opportunities without moving the state', () => {
    const signals = [signal('d1', 'supports', '2026-10-01T00:00:00Z'), signal('d2', 'opportunity', '2026-10-02T00:00:00Z')];
    expect(deriveBelief(signals, null)).toEqual({ state: 'stable', threats: 0, confirmations: 1, opportunities: 1 });
  });

  it('ignores evidence recorded before the person last answered, and counts later evidence', () => {
    const before = signal('d1', 'challenges', '2026-10-01T00:00:00Z', 3);
    const after = signal('d2', 'challenges', '2026-10-05T00:00:00Z');
    expect(deriveBelief([before], '2026-10-03T00:00:00Z').state).toBe('stable');
    expect(deriveBelief([before, after], '2026-10-03T00:00:00Z')).toMatchObject({ state: 'watch', threats: 1 });
  });
});

describe('stored status mapping', () => {
  it('round-trips every state', () => {
    for (const state of ['stable', 'watch', 'reconsider'] as const) expect(stateOf(storedStatus(state))).toBe(state);
  });
});
