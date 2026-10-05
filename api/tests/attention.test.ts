import { describe, expect, it } from 'vitest';
import { decideAttention, effectiveImpact } from '../src/domain/attention';
import { DevelopmentFacts, RelevanceInput, decideRelevance } from '../src/domain/relevance';

const challenge = { assumptionId: 'a1', effect: 'challenges' as const, reason: 'Subsidy removed' };

describe('effectiveImpact', () => {
  it('ignores a challenge that is only indirect or low confidence', () => {
    expect(effectiveImpact(challenge, 'indirect', 0.9)).toBeNull();
    expect(effectiveImpact(challenge, 'direct', 0.4)).toBeNull();
  });
  it('keeps a confident challenge on a direct link and drops "none"', () => {
    expect(effectiveImpact(challenge, 'direct', 0.8)).toEqual(challenge);
    expect(effectiveImpact({ ...challenge, effect: 'none' }, 'direct', 0.9)).toBeNull();
  });
});

describe('decideAttention', () => {
  it('puts a challenged assumption first', () => {
    expect(decideAttention({ basis: 'general', score: 0.2, impact: challenge })).toBe('act');
  });
  it('treats explicit interests and strong ambition links as worth knowing', () => {
    expect(decideAttention({ basis: 'tracked', score: 0.3, impact: null })).toBe('know');
    expect(decideAttention({ basis: 'ambition', score: 0.75, impact: null })).toBe('know');
  });
  it('leaves weak links and general importance as background', () => {
    expect(decideAttention({ basis: 'ambition', score: 0.55, impact: null })).toBe('fyi');
    expect(decideAttention({ basis: 'general', score: 0.3, impact: null })).toBe('fyi');
  });
});

const dev: DevelopmentFacts = {
  developmentId: 'd1',
  storyId: 's1',
  storyTitle: 'Subsidy removed',
  geography: 'India',
  entities: [],
  text: 'Subsidy removed',
  worldSignificance: 0.3,
  occurredAt: new Date().toISOString(),
  publishers: ['example.com'],
};

describe('decideRelevance with assumptions', () => {
  const base: RelevanceInput = {
    development: dev,
    memory: [],
    memorySimilarity: new Map(),
    trackedStory: false,
    ambition: { id: 'amb', title: 'Solar startup', priority: 1, similarity: 0.8 },
    assessment: { relation: 'direct', confidence: 0.9, whyItMatters: 'It affects pricing.', couldChange: 'This could raise costs.', assumptionImpact: challenge },
    identity: {},
    now: new Date(),
  };

  it('marks a direct, confident challenge as act and exposes the assumption', () => {
    const result = decideRelevance(base);
    expect(result.attention).toBe('act');
    expect(result.assumption?.assumptionId).toBe('a1');
  });

  it('never claims an assumption impact without an ambition link', () => {
    const result = decideRelevance({ ...base, assessment: { ...base.assessment!, relation: 'none' } });
    expect(result.assumption).toBeNull();
    expect(result.attention).toBeNull();
  });
});
