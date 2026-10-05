import { describe, expect, it } from 'vitest';
import { broaden } from '../src/lib/news';

describe('broaden', () => {
  it('shortens a long query to its first two words, because news search requires every word', () => {
    expect(broaden('software engineer salaries')).toBe('software engineer');
    expect(broaden('highest paying tech skills')).toBe('highest paying');
  });

  it('leaves short queries alone', () => {
    expect(broaden('AI jobs')).toBeNull();
    expect(broaden('layoffs')).toBeNull();
    expect(broaden('  ')).toBeNull();
  });
});
