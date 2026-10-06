import { describe, expect, it } from 'vitest';
import { repeatsAmbition } from '../src/services/script';

const titles = ['Launch a rooftop solar installation business for small commercial buildings in India'];

describe('repeatsAmbition', () => {
  it('catches a story that restates the ambition in the listener\'s own words', () => {
    expect(repeatsAmbition('For your plan to launch a rooftop solar installation business, this matters.', titles)).toBe(true);
    expect(repeatsAmbition('This helps small commercial buildings decide faster.', titles)).toBe(true);
  });

  it('allows a story that only talks about the concrete effect', () => {
    expect(repeatsAmbition('Storage costs could change what you quote in your next proposal, and the duty decision is due in March.', titles)).toBe(false);
  });

  it('ignores punctuation and case', () => {
    expect(repeatsAmbition('ROOFTOP, SOLAR: installation!', titles)).toBe(true);
  });

  it('is false when there are no ambitions to repeat', () => {
    expect(repeatsAmbition('anything at all', [])).toBe(false);
  });
});
