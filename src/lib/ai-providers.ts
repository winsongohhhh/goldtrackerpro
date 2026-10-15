export type AIProviderId = 'openai' | 'anthropic' | 'google';

export interface AIModelOption {
  id: string;
  label: string;
}

export const AI_PROVIDER_OPTIONS: Record<AIProviderId, { label: string; models: AIModelOption[] }> = {
  openai: {
    label: 'OpenAI',
    models: [
      { id: 'gpt-6-luna', label: 'GPT-6 Luna · efficient' },
      { id: 'gpt-6.1-sol', label: 'GPT-6.1 Sol · balanced' },
      { id: 'gpt-6-astra', label: 'GPT-6 Astra · flagship' },
    ],
  },
  anthropic: {
    label: 'Anthropic',
    models: [
      { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 · fast' },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 · balanced' },
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 · flagship' },
    ],
  },
  google: {
    label: 'Google Gemini',
    models: [
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite · efficient' },
      { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash · balanced' },
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash · latest' },
      { id: 'gemini-4-argon', label: 'Gemini 4 Argon · flagship' },
    ],
  },
};

export function isAIProviderId(value: unknown): value is AIProviderId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(AI_PROVIDER_OPTIONS, value);
}

export interface AIProviderConfiguration {
  provider: AIProviderId;
  model: string;
}

/** Validate the provider and model against the fixed, first-party endpoint catalog. */
export function validateAIProviderConfiguration(input: Record<string, unknown>): AIProviderConfiguration | null {
  const provider = input.provider;
  const model = typeof input.model === 'string' ? input.model.trim() : '';
  if (!isAIProviderId(provider) || !model || model.length > 120) return null;
  if (!AI_PROVIDER_OPTIONS[provider].models.some((option) => option.id === model)) return null;
  if (input.baseUrl !== undefined && input.baseUrl !== null) return null;
  if (input.base_url !== undefined && input.base_url !== null) return null;
  return { provider, model };
}

export const AI_PROVIDER_CHANGED_EVENT = 'goldtrackerpro:ai-provider-changed';

export interface AIProviderStatus {
  configured: boolean;
  provider: AIProviderId | null;
  model: string | null;
}
