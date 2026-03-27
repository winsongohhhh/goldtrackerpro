import { useState, useEffect, useCallback } from 'react';
import type { Currency } from '@/lib/gold-types';

// Exchange rates relative to USD
type Rates = Record<Currency, number>;

const FALLBACK_RATES: Rates = {
  USD: 1,
  CNY: 7.24,
  EUR: 0.92,
  MYR: 4.47,
};

export function useExchangeRates() {
  const [rates, setRates] = useState<Rates>(FALLBACK_RATES);

  const fetchRates = useCallback(async () => {
    try {
      // Fetch live mid-market forex rates
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data = await res.json();
        if (data?.rates) {
          setRates({
            USD: 1,
            CNY: data.rates.CNY ?? FALLBACK_RATES.CNY,
            EUR: data.rates.EUR ?? FALLBACK_RATES.EUR,
            MYR: data.rates.MYR ?? FALLBACK_RATES.MYR,
          });
        }
      }
    } catch {
      // keep fallback
    }
  }, []);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 60 * 1000);
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
