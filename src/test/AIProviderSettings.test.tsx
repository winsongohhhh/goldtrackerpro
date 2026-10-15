import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: vi.fn() }, functions: { invoke: vi.fn() } },
}));
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AIProviderSettings } from '@/components/AIProviderSettings';
import { I18nProvider } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

type ProviderActionBody = {
  action?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
};

let configured = false;
let statusProvider = 'anthropic';
const providerInvoke = vi.mocked(supabase.functions.invoke);

function renderSettings() {
  render(
    <I18nProvider>
      <AIProviderSettings open onOpenChange={vi.fn()} />
    </I18nProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

beforeEach(() => {
  configured = false;
  statusProvider = 'anthropic';
  localStorage.clear();
  providerInvoke.mockReset();
  providerInvoke.mockImplementation(async (_functionName, options) => {
    const body = (options as { body?: ProviderActionBody } | undefined)?.body;
    if (body?.action === 'status') {
      return {
        data: configured
          ? {
              configured: true,
              provider: statusProvider,
              model: statusProvider === 'openai-compatible' ? 'custom-model' : 'claude-sonnet-5-5',
            }
          : { configured: false, provider: null, model: null },
        error: null,
      } as never;
    }
    if (body?.action === 'save') configured = true;
    if (body?.action === 'remove') configured = false;
    return { data: { ok: true }, error: null } as never;
  });
});

describe('AIProviderSettings', () => {
  it('keeps Test and Save disabled until a provider key is entered and shows no fallback state', async () => {
    renderSettings();

    expect(await screen.findByText('AI provider not configured')).toBeInTheDocument();
    expect(screen.getByTestId('ai-provider-not-configured')).toHaveTextContent('Add a provider key to enable Advisor.');
    expect(screen.getByTestId('ai-provider-not-configured')).toHaveTextContent('No default provider fallback is available.');
    expect(screen.getByRole('button', { name: 'Test' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Test' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const actions = providerInvoke.mock.calls
      .map(([, options]) => (options as { body?: ProviderActionBody } | undefined)?.body?.action)
      .filter((action) => action === 'test' || action === 'save');
    expect(actions).toEqual([]);
  });

  it('shows OpenAI-compatible endpoints as unavailable and provides no custom URL or model fields', async () => {
    renderSettings();

    const providerSelect = await screen.findByLabelText('Provider');
    expect(screen.getByRole('option', { name: 'OpenAI-compatible — Not supported yet.' })).toBeDisabled();
    expect(providerSelect.querySelectorAll('option:not([disabled])')).toHaveLength(3);
    expect(screen.queryByLabelText(/base URL/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Model ID')).not.toBeInTheDocument();
  });

  it('treats a legacy OpenAI-compatible configuration as unconfigured', async () => {
    configured = true;
    statusProvider = 'openai-compatible';
    renderSettings();

    expect(await screen.findByText('AI provider not configured')).toBeInTheDocument();
    expect(await screen.findByLabelText('Provider')).toHaveValue('openai');
    expect(screen.queryByText('OpenAI-compatible · custom-model')).not.toBeInTheDocument();
  });

  it('tests and saves a masked user key without persisting it in localStorage', async () => {
    renderSettings();

    const providerSelect = await screen.findByLabelText('Provider');
    fireEvent.change(providerSelect, { target: { value: 'google' } });
    expect(screen.getByLabelText('Model')).toHaveValue('gemini-3.5-flash-lite');

    const keyInput = screen.getByLabelText('API key');
    expect(keyInput).toHaveAttribute('type', 'password');
    const secret = 'test-user-provider-key-123456';
    fireEvent.change(keyInput, { target: { value: secret } });

    fireEvent.click(screen.getByRole('button', { name: 'Test' }));
    expect(await screen.findByText('Connection test succeeded.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Provider settings saved.')).toBeInTheDocument();
    await waitFor(() => expect(keyInput).toHaveValue(''));

    const sentBodies = providerInvoke.mock.calls
      .map(([, options]) => (options as { body?: ProviderActionBody } | undefined)?.body)
      .filter((body): body is ProviderActionBody => Boolean(body));
    expect(sentBodies).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'test', provider: 'google', model: 'gemini-3.5-flash-lite', apiKey: secret }),
      expect.objectContaining({ action: 'save', provider: 'google', model: 'gemini-3.5-flash-lite', apiKey: secret }),
    ]));
    expect(Object.values(localStorage)).not.toContain(secret);
  });

  it('shows only active provider metadata and supports Change and Remove actions', async () => {
    configured = true;
    renderSettings();

    expect(await screen.findByText('Anthropic · claude-sonnet-5-5')).toBeInTheDocument();
    expect(screen.queryByLabelText('API key')).not.toBeInTheDocument();
    expect(screen.queryByText('Key saved · ••••DUMMY')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(await screen.findByLabelText('Provider')).toHaveValue('anthropic');
    expect(screen.getByLabelText('Model')).toHaveValue('claude-sonnet-5-5');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(await screen.findByText('Provider key removed.')).toBeInTheDocument();
    expect(providerInvoke.mock.calls.some(([, options]) => (options as { body?: ProviderActionBody })?.body?.action === 'remove')).toBe(true);
    expect(await screen.findByText('AI provider not configured')).toBeInTheDocument();
    expect(screen.getByTestId('ai-provider-not-configured')).toHaveTextContent('No default provider fallback is available.');
    expect(screen.getByRole('button', { name: 'Test' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
