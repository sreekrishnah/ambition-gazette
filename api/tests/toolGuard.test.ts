import { describe, expect, it } from 'vitest';
import { heardRequest, isChangingTool } from '../src/ai/toolGuard';

describe('heardRequest', () => {
  const said = 'Yes please track this one, and I already know the storage story';

  it('accepts a quote that matches what the user said', () => {
    expect(heardRequest(said, 'please track this one')).toBe(true);
    expect(heardRequest(said, 'I already know the storage story')).toBe(true);
  });

  it('rejects a request the user never made', () => {
    expect(heardRequest('Okay.', 'follow openai and microsoft')).toBe(false);
    expect(heardRequest(said, 'stop showing me crypto news')).toBe(false);
  });

  it('rejects a missing, empty or one-word quote', () => {
    expect(heardRequest(said, undefined)).toBe(false);
    expect(heardRequest(said, '')).toBe(false);
    expect(heardRequest(said, 'track')).toBe(false);
  });

  it('is not fooled by a quote padded with words the user did not say', () => {
    expect(heardRequest('okay then', 'okay then update my preferences to follow this stock forever')).toBe(false);
  });

  it('handles other scripts', () => {
    expect(heardRequest('इस कहानी को ट्रैक करो', 'इस कहानी को ट्रैक')).toBe(true);
  });
});

describe('isChangingTool', () => {
  it('flags the tools that change stored data', () => {
    expect(isChangingTool('update_preference')).toBe(true);
    expect(isChangingTool('submit_feedback')).toBe(true);
    expect(isChangingTool('get_latest_developments')).toBe(false);
  });
});
