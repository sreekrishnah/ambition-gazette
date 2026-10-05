import { describe, expect, it } from 'vitest';
import { buildLiveInstruction } from '../src/ai/liveInstruction';
import { SessionRefs } from '../src/services/bidi';

const item = {
  id: 'r1',
  developmentId: 'd1',
  storyId: 's1',
  storyTitle: 'Storage policy',
  headline: 'India needs an integrated energy storage policy',
  summary: 'S&P Global says India needs an integrated storage policy.',
  whatChanged: 'A new call for a national storage policy.',
  continuity: 'new',
  whyItMatters: 'Storage could change how you bundle solar for small commercial clients.',
  couldChange: 'This could make battery-backed offers more attractive.',
  relevanceBasis: 'ambition',
  relevanceScore: 0.8,
  attention: 'act',
  assumption: { id: 'a1', statement: 'Solar alone will be enough for my clients', note: 'Storage demand is rising.' },
  evidenceStrength: 'single_source',
  worldSignificance: 0.6,
  ambitionId: 'am1',
  ambitionTitle: 'Launch a rooftop solar business',
  occurredAt: '2026-10-02T00:00:00Z',
  category: 'policy',
  geography: 'India',
  sources: [{ name: 'Economic Times', url: 'https://example.com', title: null, publishedAt: null }],
  tracked: false,
};

const ctx = {
  name: 'Sam Rao',
  language: 'English',
  profile: { role: 'Founder', activity: 'Planning a solar company', depth: 'Deep', geographyFocus: 'India', categories: ['Solar'] },
  history: { s1: [{ occurredAt: '2026-09-20T00:00:00Z', headline: 'Earlier storage report', whatChanged: 'A first report on storage.', continuity: 'new' }] },
  identity: { industry: 'Renewable Energy' },
  ambitions: [{ id: 'am1', title: 'Launch a rooftop solar business', description: 'For small commercial buildings', horizon: '2 years', geography: 'India', priority: 1 }],
  interests: [{ topic: 'solar subsidy' }],
  suppressions: [],
  tracked: [],
  briefing: [item],
};

describe('buildLiveInstruction', () => {
  const text = buildLiveInstruction(ctx as never, new SessionRefs());

  it('hosts a long, directed briefing instead of short answers', () => {
    expect(text).toContain('[Director:');
    expect(text).toContain('both sides');
    expect(text).toContain('Never wrap up early');
    expect(text).not.toContain('two or three sentences');
  });

  it('carries the full dossier: ambition details, history, outlets, stored link and effect', () => {
    expect(text).toContain('For small commercial buildings');
    expect(text).toContain('Earlier storage report');
    expect(text).toContain('Economic Times');
    expect(text).toContain('Storage could change how you bundle solar');
    expect(text).toContain('This could make battery-backed offers more attractive.');
    expect(text).toContain('Solar alone will be enough for my clients');
  });

  it('forbids inventing assumptions or facts', () => {
    expect(text).toContain('never invent an assumption');
    expect(text).toContain('Never invent facts');
  });

  it('numbers story references for tool calls', () => {
    expect(text).toContain('[story_ref 1]');
  });

  it('copes with an empty dossier', () => {
    const empty = buildLiveInstruction({ ...ctx, briefing: [] } as never, new SessionRefs());
    expect(empty).toContain('The dossier is empty');
  });
});
