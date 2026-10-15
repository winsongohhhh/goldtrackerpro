import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, LockKeyhole, PlugZap, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { useAIProviderStatus } from '@/hooks/use-ai-provider-status';
import {
  AI_PROVIDER_CHANGED_EVENT,
  AI_PROVIDER_OPTIONS,
  type AIProviderId,
} from '@/lib/ai-providers';
import { supabase } from '@/integrations/supabase/client';

interface AIProviderSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PROVIDER_IDS = Object.keys(AI_PROVIDER_OPTIONS) as AIProviderId[];
const DEFAULT_PROVIDER: AIProviderId = 'openai';

export function AIProviderSettings({ open, onOpenChange }: AIProviderSettingsProps) {
  const { t, lang } = useI18n();
  const { status, loading: statusLoading, refresh } = useAIProviderStatus(true, open);
  const apiKeyRef = useRef<HTMLInputElement>(null);
  const [provider, setProvider] = useState<AIProviderId>(DEFAULT_PROVIDER);
  const [model, setModel] = useState(AI_PROVIDER_OPTIONS[DEFAULT_PROVIDER].models[0].id);
  const [editing, setEditing] = useState(false);
  const [hasKeyInput, setHasKeyInput] = useState(false);
  const [busy, setBusy] = useState<'test' | 'save' | 'remove' | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const isChinese = lang === 'cn';
  const models = AI_PROVIDER_OPTIONS[provider].models;

  useEffect(() => {
    if (!open) {
      if (apiKeyRef.current) apiKeyRef.current.value = '';
      setHasKeyInput(false);
      return;
    }
    setEditing(!status.configured);
    if (status.configured && status.provider) {
      setProvider(status.provider);
      setModel(status.model ?? AI_PROVIDER_OPTIONS[status.provider].models[0]?.id ?? '');
    }
  }, [open, status.configured, status.provider, status.model]);

  useEffect(() => {
    if (open) setFeedback(null);
  }, [open]);

  const handleProviderChange = (nextProvider: AIProviderId) => {
    if (apiKeyRef.current) apiKeyRef.current.value = '';
    setHasKeyInput(false);
    setProvider(nextProvider);
    setModel(AI_PROVIDER_OPTIONS[nextProvider].models[0]?.id ?? '');
    setFeedback(null);
  };

  const invokeAction = async (action: 'test' | 'save' | 'remove') => {
    setBusy(action);
    setFeedback(null);
    try {
      const body: Record<string, unknown> = { action };
      if (action !== 'remove') {
        const apiKey = apiKeyRef.current?.value ?? '';
        if (!apiKey.trim()) {
          setFeedback({ kind: 'error', text: t.aiProviderKeyRequired });
          setBusy(null);
          return;
        }
        if (!model) {
          setFeedback({ kind: 'error', text: t.aiProviderModelRequired });
          setBusy(null);
          return;
        }
        Object.assign(body, {
          provider,
          model,
          apiKey,
        });
      }

      const { data, error } = await supabase.functions.invoke('gold-advisor-provider', { body });
      if (error || data?.error) {
        setFeedback({
          kind: 'error',
          text: action === 'test' ? t.aiProviderTestFailed : action === 'save' ? t.aiProviderSaveFailed : t.aiProviderRemoveFailed,
        });
        return;
      }

      if (action === 'test') {
        setFeedback({ kind: 'success', text: t.aiProviderTestSucceeded });
      } else if (action === 'save') {
        if (apiKeyRef.current) apiKeyRef.current.value = '';
        setHasKeyInput(false);
        window.dispatchEvent(new Event(AI_PROVIDER_CHANGED_EVENT));
        setFeedback({ kind: 'success', text: t.aiProviderSaved });
        setEditing(false);
        await refresh();
      } else {
        if (apiKeyRef.current) apiKeyRef.current.value = '';
        setHasKeyInput(false);
        window.dispatchEvent(new Event(AI_PROVIDER_CHANGED_EVENT));
        setFeedback({ kind: 'success', text: t.aiProviderRemoved });
        setEditing(true);
        setProvider(DEFAULT_PROVIDER);
        setModel(AI_PROVIDER_OPTIONS[DEFAULT_PROVIDER].models[0].id);
        await refresh();
      }
    } catch {
      setFeedback({
        kind: 'error',
        text: action === 'test' ? t.aiProviderTestFailed : action === 'save' ? t.aiProviderSaveFailed : t.aiProviderRemoveFailed,
      });
    } finally {
      setBusy(null);
    }
  };

  const startEditing = () => {
    if (status.provider) {
      setProvider(status.provider);
      setModel(status.model ?? AI_PROVIDER_OPTIONS[status.provider].models[0]?.id ?? '');
    }
    setFeedback(null);
    setEditing(true);
  };

  const providerName = status.provider ? AI_PROVIDER_OPTIONS[status.provider].label : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1.5rem)] max-w-xl overflow-y-auto border-white/10 bg-[#17191D] text-white sm:rounded-2xl">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-4 w-4 text-[#E5A93C]" aria-hidden="true" />
            {t.aiProviderTitle}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-white/60">
            {t.aiProviderDescription}
          </DialogDescription>
        </DialogHeader>

        {statusLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-white/60" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t.aiProviderLoading}
          </div>
        ) : status.configured && !editing ? (
          <div data-testid="ai-provider-configured-state" className="space-y-4">
            <div data-testid="ai-provider-configured-card" className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                <Check className="h-4 w-4" aria-hidden="true" />
                {t.aiProviderConfigured}
              </div>
              <p className="mt-2 break-all text-sm text-white">{providerName} · {status.model}</p>
              {feedback && (
                <p role="status" className={`mt-3 text-sm ${feedback.kind === 'success' ? 'text-emerald-200' : 'text-red-200'}`}>
                  {feedback.text}
                </p>
              )}
              <div data-testid="ai-provider-configured-actions" className="mt-4 flex flex-col-reverse gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div data-testid="ai-provider-fixture-slot" className="flex items-center" />
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => void invokeAction('remove')}
                    disabled={busy !== null}
                    className="border-red-400/25 bg-transparent text-red-200 hover:bg-red-400/10 hover:text-red-100"
                  >
                    {busy === 'remove' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    {t.aiProviderRemove}
                  </Button>
                  <Button onClick={startEditing} className="bg-[#E5A93C] text-black hover:bg-[#F0B94C]">
                    {t.aiProviderChange}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-white/55">{t.aiProviderUsageNotice}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {!status.configured && (
              <div role="status" data-testid="ai-provider-not-configured" className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2.5">
                <p className="text-sm font-medium text-amber-100">{t.aiProviderNotConfigured}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/65">{t.aiProviderEnableAdvisor} {t.aiProviderNoDefaultFallback}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="ai-provider-choice" className="text-xs text-white/75">{t.aiProviderSelectProvider}</Label>
              <select
                id="ai-provider-choice"
                value={provider}
                onChange={(event) => handleProviderChange(event.target.value as AIProviderId)}
                className="h-11 w-full rounded-lg border border-white/10 bg-[#24272C] px-3 text-sm text-white outline-none focus:border-[#E5A93C]"
              >
                {PROVIDER_IDS.map((id) => <option key={id} value={id}>{AI_PROVIDER_OPTIONS[id].label}</option>)}
                <option value="openai-compatible" disabled>{t.aiProviderUnsupported}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-provider-model" className="text-xs text-white/75">{t.aiProviderSelectModel}</Label>
              <select
                id="ai-provider-model"
                value={model}
                onChange={(event) => {
                  setModel(event.target.value);
                  setFeedback(null);
                }}
                className="h-11 w-full rounded-lg border border-white/10 bg-[#24272C] px-3 text-sm text-white outline-none focus:border-[#E5A93C]"
              >
                {models.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-provider-api-key" className="text-xs text-white/75">{t.aiProviderAPIKey}</Label>
              <Input
                id="ai-provider-api-key"
                ref={apiKeyRef}
                type="password"
                autoComplete="new-password"
                autoCapitalize="none"
                spellCheck={false}
                placeholder={t.aiProviderKeyPlaceholder}
                onChange={(event) => setHasKeyInput(event.currentTarget.value.trim().length > 0)}
                className="h-11 border-white/10 bg-[#24272C] text-white placeholder:text-white/35"
              />
              <p className="flex items-start gap-1.5 text-xs leading-relaxed text-white/45">
                <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{t.aiProviderSecurityNote}</span>
              </p>
            </div>

            <p className="text-xs leading-relaxed text-white/55">{t.aiProviderUsageNotice}</p>

            {feedback && (
              <p role="status" className={`text-sm ${feedback.kind === 'success' ? 'text-emerald-200' : 'text-red-200'}`}>
                {feedback.text}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-white/[0.08] pt-4 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  if (status.configured) setEditing(false);
                  else onOpenChange(false);
                }}
                className="text-white/65 hover:bg-white/[0.06] hover:text-white"
              >
                {isChinese ? '取消' : 'Cancel'}
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void invokeAction('test')}
                  disabled={busy !== null || !hasKeyInput}
                  className="border-white/15 bg-transparent text-white hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-white/35 disabled:opacity-100 disabled:hover:bg-white/[0.03]"
                >
                  {busy === 'test' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
                  {t.aiProviderTest}
                </Button>
                <Button
                  type="button"
                  onClick={() => void invokeAction('save')}
                  disabled={busy !== null || !hasKeyInput}
                  className="bg-[#E5A93C] text-black hover:bg-[#F0B94C] disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-white/35 disabled:opacity-100 disabled:hover:bg-white/[0.08]"
                >
                  {busy === 'save' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t.aiProviderSave}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
