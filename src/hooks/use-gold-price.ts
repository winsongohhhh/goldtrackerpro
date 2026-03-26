import { useState, useEffect, useCallback } from 'react';
import type { GoldPrice } from '@/lib/gold-types';
import { supabase } from '@/integrations/supabase/client';

const OZ_TO_GRAM = 31.1035;

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '2Y' | '5Y' | '10Y' | 'ALL';

interface YahooParams {
  interval: string;
  range: string;
}

function getYahooParams(range: TimeRange): YahooParams {
  switch (range) {
    case '1D':  return { interval: '5m',  range: '1d' };
    case '1W':  return { interval: '15m', range: '5d' };
    case '1M':  return { interval: '1h',  range: '1mo' };
    case '3M':  return { interval: '1d',  range: '3mo' };
    case '6M':  return { interval: '1d',  range: '6mo' };
    case 'YTD': return { interval: '1d',  range: 'ytd' };
    case '1Y':  return { interval: '1d',  range: '1y' };
    case '2Y':  return { interval: '1wk', range: '2y' };
    case '5Y':  return { interval: '1wk', range: '5y' };
    case '10Y': return { interval: '1mo', range: '10y' };
    case 'ALL': return { interval: '1mo', range: 'max' };
  }
}

async function fetchHistoricalPrices(range: TimeRange): Promise<GoldPrice[] | null> {
  const { interval, range: r } = getYahooParams(range);

  try {
    const { data, error } = await supabase.functions.invoke('yahoo-finance', {
      body: null,
      headers: { 'Content-Type': 'application/json' },
    });

    // supabase.functions.invoke uses POST by default, but we need GET params
    // Let's use fetch directly with the edge function URL
    const projectId = import.meta.env.VITE_SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '');
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yahoo-finance?interval=${interval}&range=${r}`;
    
    const res = await fetch(fnUrl, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[] = result.timestamp;
    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close;
    if (!timestamps || !closes) return null;

    const points: GoldPrice[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close != null && close > 0) {
        points.push({
          timestamp: timestamps[i] * 1000,
          price: Math.round((close / OZ_TO_GRAM) * 100) / 100,
        });
      }
    }
    if (points.length > 0) return points;
  } catch {
    // fallback
  }

  return null;
}

async function fetchCurrentPrice(): Promise<number | null> {
  try {
    const res = await fetch('https://api.gold-api.com/price/XAU');
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.price === 'number' && data.price > 0) {
        return Math.round((data.price / OZ_TO_GRAM) * 100) / 100;
      }
    }
  } catch { /* fallback */ }
  return null;
}

export function useGoldPrice() {
  const [prices, setPrices] = useState<GoldPrice[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');

  // Load historical data when range changes
  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      setLoading(true);
      const historical = await fetchHistoricalPrices(timeRange);
      if (cancelled) return;
      if (historical && historical.length > 0) {
        setPrices(historical);
        setCurrentPrice(historical[historical.length - 1].price);
      }
      setLoading(false);
      setLastUpdated(new Date());
    }
    loadHistory();
    return () => { cancelled = true; };
  }, [timeRange]);

  // Poll current price every 10s
  const fetchPrice = useCallback(async () => {
    const price = await fetchCurrentPrice();
    if (price) {
      setCurrentPrice(price);
      if (timeRange === '1D') {
        setPrices(prev => {
          const newPoint: GoldPrice = { timestamp: Date.now(), price };
          const updated = [...prev, newPoint];
          return updated.slice(-500);
        });
      }
      setLastUpdated(new Date());
    }
  }, [timeRange]);

  useEffect(() => {
    const interval = setInterval(fetchPrice, 10000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  return { prices, currentPrice, loading, lastUpdated, refetch: fetchPrice, timeRange, setTimeRange };
}
