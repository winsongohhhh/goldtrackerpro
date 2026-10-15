import { describe, expect, it } from 'vitest';
import { AI_PROVIDER_OPTIONS, isAIProviderId, validateAIProviderConfiguration } from '@/lib/ai-providers';

describe('fixed AI provider policy', () => {
  it('allows only OpenAI, Anthropic, and Google Gemini', () => {
    expect(Object.keys(AI_PROVIDER_OPTIONS)).toEqual(['openai', 'anthropic', 'google']);
    expect(isAIProviderId('openai')).toBe(true);
    expect(isAIProviderId('anthropic')).toBe(true);
    expect(isAIProviderId('google')).toBe(true);
    expect(isAIProviderId('openai-compatible')).toBe(false);
    expect(isAIProviderId('custom')).toBe(false);
  });

  it('accepts only catalogued models and returns a config without any endpoint URL', () => {
    expect(validateAIProviderConfiguration({ provider: 'openai', model: 'gpt-6-luna' })).toEqual({
      provider: 'openai',
      model: 'gpt-6-luna',
    });
    expect(validateAIProviderConfiguration({ provider: 'google', model: 'gemini-3.5-flash-lite' })).toEqual({
      provider: 'google',
      model: 'gemini-3.5-flash-lite',
    });
    expect(validateAIProviderConfiguration({
      provider: 'openai',
      model: 'gpt-6-luna',
      baseUrl: 'https://attacker.example/v1',
    })).toBeNull();
    expect(validateAIProviderConfiguration({
      provider: 'openai',
      model: 'gpt-6-luna',
      base_url: 'https://attacker.example/v1',
    })).toBeNull();
  });

  it('rejects arbitrary OpenAI-compatible endpoints, unknown providers, and unlisted models', () => {
    expect(validateAIProviderConfiguration({
      provider: 'openai-compatible',
      model: 'anything',
      baseUrl: 'https://attacker.example/v1',
    })).toBeNull();
    expect(validateAIProviderConfiguration({ provider: 'custom', model: 'model' })).toBeNull();
    expect(validateAIProviderConfiguration({ provider: 'anthropic', model: 'unlisted-model' })).toBeNull();
  });
});
