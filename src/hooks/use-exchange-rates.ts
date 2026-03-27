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

// Gold price multipliers per currency (ratio vs USD gold price)
// These capture local premiums beyond simple forex conversion
type GoldRates = Record<Currency, number>;

export function useExchangeRates() {
  const [rates, setRates] = useState<Rates>(FALLBACK_RATES);
  const [goldRates, setGoldRates] = useState<GoldRates>({ USD: 1, CNY: 7.24, EUR: 0.92, MYR: 4.47 });

  const fetchRates = useCallback(async () => {
    try {
      // Fetch forex rates
      const forexPromise = fetch('https://open.er-api.com/v6/latest/USD');
      // Fetch gold prices in multiple currencies from gold-api
      const goldUsdPromise = fetch('https://api.gold-api.com/price/XAU');
      const goldCnyPromise = fetch('https://api.gold-api.com/price/XAU/CNY');
      const goldEurPromise = fetch('https://api.gold-api.com/price/XAU/EUR');
      const goldMyrPromise = fetch('https://api.gold-api.com/price/XAU/MYR');

      const [forexRes, goldUsdRes, goldCnyRes, goldEurRes, goldMyrRes] = await Promise.all([
        forexPromise, goldUsdPromise, goldCnyPromise, goldEurPromise, goldMyrPromise,
      ]);

      // Update forex rates
      if (forexRes.ok) {
        const data = await forexRes.json();
        if (data?.rates) {
          setRates({
            USD: 1,
            CNY: data.rates.CNY ?? FALLBACK_RATES.CNY,
            EUR: data.rates.EUR ?? FALLBACK_RATES.EUR,
            MYR: data.rates.MYR ?? FALLBACK_RATES.MYR,
          });
        }
      }

      // Calculate real gold price ratios per currency
      const usdPrice = goldUsdRes.ok ? (await goldUsdRes.json())?.price : null;
      if (usdPrice && usdPrice > 0) {
        const newGoldRates: GoldRates = { USD: 1, CNY: 7.24, EUR: 0.92, MYR: 4.47 };
        
        const cnyData = goldCnyRes.ok ? await goldCnyRes.json() : null;
        if (cnyData?.price > 0) newGoldRates.CNY = cnyData.price / usdPrice;
        
        const eurData = goldEurRes.ok ? await goldEurRes.json() : null;
        if (eurData?.price > 0) newGoldRates.EUR = eurData.price / usdPrice;
        
        const myrData = goldMyrRes.ok ? await goldMyrRes.json() : null;
        if (myrData?.price > 0) newGoldRates.MYR = myrData.price / usdPrice;
        
        setGoldRates(newGoldRates);
      }
    } catch {
      // keep existing rates
    }
  }, []);

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 60 * 1000); // every 1 min
    return () => clearInterval(interval);
  }, [fetchRates]);

  const convert = useCallback(
    (amountUSD: number, toCurrency: Currency): number => {
      // Use real gold price ratios instead of simple forex conversion
      return amountUSD * goldRates[toCurrency];
    },
    [goldRates]
  );

  return { rates, goldRates, convert };
}
