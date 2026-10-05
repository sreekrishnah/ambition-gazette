import { describe, expect, it } from 'vitest';
import { DevelopmentFacts, RelevanceInput, decideRelevance } from '../src/domain/relevance';
import { MemoryRow } from '../src/domain/types';

const dev: DevelopmentFacts = {
  developmentId: 'd1',
  storyId: 's1',
  storyTitle: 'Solar subsidy narrowed',
  geography: 'India',
  entities: [],
  text: 'Solar subsidy narrowed for commercial users',
  worldSignificance: 0.3,
  occurredAt: new Date().toISOString(),
  publishers: ['example.com'],
};

function memory(partial: Partial<MemoryRow> & Pick<MemoryRow, 'memory_type'>): MemoryRow {
  return {
    id: 'm1',
    user_id: 'u1',
    topic: 'solar subsidy',
    content: 'solar subsidy',
    strength: 0.8,
    confidence: 1,
    source: 'explicit',
    valid_until: null,
    status: 'active',
    structured_value: null,
    priority: null,
    created_at: '',
    updated_at: '',
    ...partial,
  };
}

function input(rows: MemoryRow[], extra: Partial<RelevanceInput> = {}): RelevanceInput {
  return {
    development: dev,
    memory: rows,
    memorySimilarity: new Map(),
    trackedStory: false,
    ambition: null,
    assessment: null,
    identity: {},
    now: new Date(),
    ...extra,
  };
}

describe('decideRelevance', () => {
  const ambition = { id: 'a1', title: 'Launch solar startup', priority: 1, similarity: 0.7 };
  const linked = { relation: 'direct' as const, confidence: 0.8, whyItMatters: 'Storage rules could change how you price solar for small clients.', couldChange: 'This could shift your margins.' };

  it('does not show an item merely because it matches something the user follows', () => {
    const result = decideRelevance(input([memory({ memory_type: 'interest' })]));
    expect(result.show).toBe(false);
    expect(result.whyItMatters).toBeNull();
  });

  it('asks the model about a followed topic, then shows it with the model reasoning and not the stored memory', () => {
    const asked = decideRelevance(input([memory({ memory_type: 'interest' })], { ambition }));
    expect(asked.needsAmbitionAssessment).toBe(true);
    const shown = decideRelevance(input([memory({ memory_type: 'interest' })], { ambition, assessment: linked }));
    expect(shown.show).toBe(true);
    expect(shown.whyItMatters).toBe(linked.whyItMatters);
    expect(shown.whyItMatters).not.toContain('You asked to follow');
    expect(shown.basis).toBe('preference');
  });

  it('ignores interests that were only inferred from a question', () => {
    const inferred = memory({ memory_type: 'interest', source: 'inferred', strength: 0.4, valid_until: '2099-01-01T00:00:00Z' });
    const result = decideRelevance(input([inferred]));
    expect(result.show).toBe(false);
    expect(result.needsAmbitionAssessment).toBe(false);
    expect(result.factors).toHaveLength(0);
  });

  it('never shows an item without an explanation, even when the model calls it related', () => {
    const noReason = { ...linked, whyItMatters: '   ' };
    expect(decideRelevance(input([], { ambition, assessment: noReason })).show).toBe(false);
  });

  it('does not show an item on world significance alone', () => {
    const big = { ...dev, worldSignificance: 0.95 };
    expect(decideRelevance({ ...input([]), development: big }).show).toBe(false);
  });

  it('shows a tracked story, explaining it plainly when the model finds no further link', () => {
    const tracked = decideRelevance(input([], { trackedStory: true, ambition, assessment: { relation: 'none', confidence: 0.9, whyItMatters: '', couldChange: '' } }));
    expect(tracked.show).toBe(true);
    expect(tracked.basis).toBe('tracked');
    expect(tracked.whyItMatters).toContain('tracking');
  });

  it('lets an explicit rejection beat an explicit preference of the same rank', () => {
    const result = decideRelevance(
      input([memory({ memory_type: 'interest' }), memory({ id: 'm2', memory_type: 'suppression' })]),
    );
    expect(result.show).toBe(false);
    expect(result.suppressed).toBe(true);
    expect(result.suppressedReason).toContain('stop seeing');
    expect(result.suppressedMemoryId).toBe('m2');
  });

  it('never invents an ambition link when the model says there is none', () => {
    const result = decideRelevance(
      input([], {
        ambition: { id: 'a1', title: 'Launch solar startup', priority: 1, similarity: 0.7 },
        assessment: { relation: 'none', confidence: 0.9, whyItMatters: '', couldChange: '' },
      }),
    );
    expect(result.show).toBe(false);
    expect(result.ambitionId).toBeNull();
  });

  it('carries the hedged consequence only when an ambition link is established', () => {
    const ambition = { id: 'a1', title: 'Launch solar startup', priority: 1, similarity: 0.7 };
    const linked = decideRelevance(
      input([], { ambition, assessment: { relation: 'direct', confidence: 0.8, whyItMatters: 'Matters.', couldChange: 'This could raise your costs.' } }),
    );
    expect(linked.couldChange).toBe('This could raise your costs.');
    const unlinked = decideRelevance(input([memory({ memory_type: 'interest' })]));
    expect(unlinked.couldChange).toBeNull();
  });

  it('asks for a model assessment whenever an ambition is a plausible match', () => {
    const ambition = { id: 'a1', title: 'Launch solar startup', priority: 1, similarity: 0.7 };
    expect(decideRelevance(input([], { ambition })).needsAmbitionAssessment).toBe(true);
    expect(decideRelevance(input([], { ambition: { ...ambition, similarity: 0.2 } })).needsAmbitionAssessment).toBe(false);
  });
});
