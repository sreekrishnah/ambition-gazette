import { describe, expect, it } from 'vitest';
import { CoverageEntry, buildLens } from '../src/domain/lens';

function entry(partial: Partial<CoverageEntry> & { developmentId: string }): CoverageEntry {
  return {
    storyId: partial.developmentId,
    storyTitle: 'Story',
    headline: 'Headline',
    occurredAt: '2026-10-01T00:00:00Z',
    worldSignificance: 0.5,
    personalRelevance: 0,
    shown: false,
    suppressed: false,
    suppressedReason: null,
    suppressedMemoryId: null,
    basis: null,
    attention: null,
    ...partial,
  };
}

describe('buildLens', () => {
  it('lists big world stories that are weak for the user', () => {
    const lens = buildLens([entry({ developmentId: 'a', worldSignificance: 0.9, personalRelevance: 0.1 })], []);
    expect(lens.bigInWorld.map((i) => i.developmentId)).toEqual(['a']);
  });

  it('lists quiet stories that matter strongly to the user', () => {
    const lens = buildLens(
      [entry({ developmentId: 'b', worldSignificance: 0.2, personalRelevance: 0.8, shown: true, basis: 'ambition' })],
      [],
    );
    expect(lens.quietButYours.map((i) => i.developmentId)).toEqual(['b']);
    expect(lens.bigInWorld).toHaveLength(0);
  });

  it('keeps suppressed items out of the world list and reports the stored reason', () => {
    const lens = buildLens(
      [entry({ developmentId: 'c', worldSignificance: 0.9, suppressed: true, suppressedReason: 'You asked to stop seeing "x"', suppressedMemoryId: 'mem-1' })],
      [],
    );
    expect(lens.bigInWorld).toHaveLength(0);
    expect(lens.hidden[0]?.reason).toBe('You asked to stop seeing "x"');
    expect(lens.hidden[0]?.memoryId).toBe('mem-1');
  });

  it('shows one entry per story, using the latest development', () => {
    const lens = buildLens(
      [
        entry({ developmentId: 'old', storyId: 's', worldSignificance: 0.9, occurredAt: '2026-09-01T00:00:00Z' }),
        entry({ developmentId: 'new', storyId: 's', worldSignificance: 0.9, occurredAt: '2026-10-02T00:00:00Z' }),
      ],
      [],
    );
    expect(lens.bigInWorld.map((i) => i.developmentId)).toEqual(['new']);
  });

  it('counts items set aside and maps feedback to the effect that was stored', () => {
    const lens = buildLens(
      [entry({ developmentId: 'd' }), entry({ developmentId: 'e', shown: true, basis: 'preference', personalRelevance: 0.9 })],
      [
        { id: '1', createdAt: '2026-10-02T00:00:00Z', feedbackType: 'already_know', storyTitle: 'Story', reason: null },
        { id: '2', createdAt: '2026-10-02T00:00:00Z', feedbackType: 'unknown_type', storyTitle: null, reason: null },
        { id: '3', createdAt: '2026-10-01T00:00:00Z', feedbackType: 'already_know', storyTitle: 'Story', reason: null },
      ],
    );
    expect(lens.setAside).toBe(1);
    expect(lens.learning.events.map((e) => e.effect)).toEqual(['This update hidden']);
    expect(lens.learning.movedUp.map((m) => m.developmentId)).toEqual(['e']);
  });
});

describe('buildLens funnel', () => {
  it('counts each filtering stage from the stored ledger', () => {
    const lens = buildLens(
      [
        entry({ developmentId: 'a' }),
        entry({ developmentId: 'b' }),
        entry({ developmentId: 'c', shown: true, attention: 'fyi' }),
        entry({ developmentId: 'd', shown: true, attention: 'know' }),
        entry({ developmentId: 'e', shown: true, attention: 'act' }),
      ],
      [],
    );
    expect(lens.funnel).toEqual({ checked: 5, shown: 3, important: 2, needsAttention: 1 });
  });
});
