import { useState, useEffect, useCallback } from 'react';
import type { Currency } from '@/lib/gold-types';

// Exchange rates relative to USD
type Rates = Record<Currency, number>;

const FALLBACK_RATES: Rates = {
  USD: 1,
  CNY: 7.24,
  EUR: 0.92,
  MYR: 4.47,
  SGD: 1.34,
};

export function useExchangeRates() {
  const [rates, setRates] = useState<Rates>(FALLBACK_RATES);

  const fetchRates = useCallback(async () => {
    try {
      // Fetch via edge function to avoid CORS issues
      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yahoo-finance?mode=fx`;
      const res = await fetch(fnUrl, {
        headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.rates) {
          setRates({
            USD: 1,
            CNY: data.rates.CNY ?? FALLBACK_RATES.CNY,
            EUR: data.rates.EUR ?? FALLBACK_RATES.EUR,
            MYR: data.rates.MYR ?? FALLBACK_RATES.MYR,
            SGD: data.rates.SGD ?? FALLBACK_RATES.SGD,
          });
        }
      }
    } catch {
      // keep fallback
    }
  }, []);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 30 * 1000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchRates]);

  const convert = useCallback(
    (amountUSD: number, toCurrency: Currency): number => {
      return amountUSD * rates[toCurrency];
    },
    [rates]
  );

  return { rates, convert };
}
