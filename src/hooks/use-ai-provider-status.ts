import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AI_PROVIDER_CHANGED_EVENT, AI_PROVIDER_OPTIONS, type AIProviderId, type AIProviderStatus } from '@/lib/ai-providers';

const EMPTY_STATUS: AIProviderStatus = {
  configured: false,
  provider: null,
  model: null,
};

export function useAIProviderStatus(refreshOnOpen = false, isOpen = true) {
  const [status, setStatus] = useState<AIProviderStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gold-advisor-provider', {
        body: { action: 'status' },
      });
      if (error || !data || typeof data !== 'object') {
        setStatus(EMPTY_STATUS);
        return;
      }
      const provider = typeof data.provider === 'string' && Object.prototype.hasOwnProperty.call(AI_PROVIDER_OPTIONS, data.provider)
        ? data.provider as AIProviderId
        : null;
      setStatus({
        configured: data.configured === true && provider !== null,
        provider,
        model: typeof data.model === 'string' ? data.model : null,
      });
    } catch {
      setStatus(EMPTY_STATUS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!refreshOnOpen || isOpen) void refresh();
  }, [isOpen, refresh, refreshOnOpen]);

  useEffect(() => {
    const onChanged = () => void refresh();
    window.addEventListener(AI_PROVIDER_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(AI_PROVIDER_CHANGED_EVENT, onChanged);
  }, [refresh]);

  return { status, loading, refresh };
}
