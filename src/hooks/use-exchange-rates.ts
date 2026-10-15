import { useState, useEffect, useCallback } from 'react';
import type { Currency } from '@/lib/gold-types';

// Exchange rates relative to USD
export type Rates = Record<Currency, number>;
export type ExchangeRateFreshness = 'live' | 'stale';

export const FALLBACK_RATES: Rates = {
  USD: 1,
  CNY: 7.24,
  EUR: 0.92,
  MYR: 4.47,
  SGD: 1.34,
};

const FX_CURRENCIES = ['CNY', 'EUR', 'MYR', 'SGD'] as const;

export function useExchangeRates() {
  const [rates, setRates] = useState<Rates>(FALLBACK_RATES);
  const [freshness, setFreshness] = useState<ExchangeRateFreshness>('stale');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRates = useCallback(async () => {
    try {
      // Fetch via edge function to avoid CORS issues
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yahoo-finance?mode=fx`;
      const res = await fetch(fnUrl, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      if (!res.ok) {
        setFreshness('stale');
        return;
      }

      const data = await res.json();
      const receivedRates = data?.rates as Partial<Rates> | undefined;
      const hasAllRates = FX_CURRENCIES.every((currency) => {
        const value = receivedRates?.[currency];
        return typeof value === 'number' && Number.isFinite(value) && value > 0;
      });
      if (!hasAllRates) {
        setFreshness('stale');
        return;
      }

      setRates({
        USD: 1,
        CNY: receivedRates!.CNY!,
        EUR: receivedRates!.EUR!,
        MYR: receivedRates!.MYR!,
        SGD: receivedRates!.SGD!,
      });
      setLastUpdated(new Date());
      setFreshness('live');
    } catch {
      // Keep the last usable rates, but make their stale status visible.
      setFreshness('stale');
    }
  }, []);

  useEffect(() => {
    void fetchRates();
    const interval = setInterval(() => void fetchRates(), 30 * 1000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchRates]);

  const convert = useCallback(
    (amountUSD: number, toCurrency: Currency): number => amountUSD * rates[toCurrency],
    [rates],
  );

  return { rates, convert, freshness, lastUpdated };
}
