import { describe, expect, it } from 'vitest';
import { VOICE_LANGUAGES, transcriptionHints } from '../src/ai/liveSpeech';

const base = { name: 'Srithar Kumar', ambitions: [{ title: 'Launch rooftop solar in India' }], interests: [{ topic: 'solar subsidy' }, { topic: null }] };

describe('transcriptionHints', () => {
  it('pins English to Indian English so short phrases are not detected as another language', () => {
    expect(transcriptionHints({ ...base, language: 'English' }).languageCodes).toEqual(['en-IN']);
  });

  it('keeps English alongside another language because speakers mix them', () => {
    expect(transcriptionHints({ ...base, language: 'Tamil' }).languageCodes).toEqual(['ta-IN', 'en-IN']);
  });

  it('falls back to Indian English for an unknown language rather than guessing', () => {
    expect(transcriptionHints({ ...base, language: 'Klingon' }).languageCodes).toEqual(['en-IN']);
  });

  it('adds the product name, first name, ambitions and interests, without blanks or duplicates', () => {
    const { customVocabulary } = transcriptionHints({ ...base, language: 'English' });
    expect(customVocabulary).toEqual(['Ambition Gazette', 'Gazzy', 'Srithar', 'Launch rooftop solar in India', 'solar subsidy']);
  });

  it('caps the vocabulary size', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ topic: `topic number ${i}` }));
    expect(transcriptionHints({ ...base, language: 'English', interests: many }).customVocabulary).toHaveLength(20);
  });
});

describe('VOICE_LANGUAGES', () => {
  it('offers every language onboarding offers, and each one resolves to a recognition code', () => {
    for (const language of ['English', 'Spanish', 'French', 'German', 'Hindi', 'Mandarin']) {
      expect(VOICE_LANGUAGES).toContain(language);
    }
    for (const language of VOICE_LANGUAGES) {
      const codes = transcriptionHints({ name: null, ambitions: [], interests: [], language }).languageCodes;
      expect(codes.length).toBeGreaterThan(0);
      if (language !== 'English') expect(codes[0]).not.toBe('en-IN');
    }
  });
});
