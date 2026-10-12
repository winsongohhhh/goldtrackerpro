import { useState, useEffect, useCallback } from 'react';
import type { GoldPrice } from '@/lib/gold-types';

const OZ_TO_GRAM = 31.1035;
export const PRICE_STALE_AFTER_MS = 30_000;

export type TimeRange = '7D' | '1M' | '6M' | '1Y' | 'ALL';
export type MarketFreshness = 'live' | 'stale' | 'unavailable';

interface YahooParams {
  interval: string;
  range: string;
}

function getYahooParams(range: TimeRange): YahooParams {
  switch (range) {
    case '7D':  return { interval: '15m', range: '1mo' };
    case '1M':  return { interval: '1h', range: '1mo' };
    case '6M':  return { interval: '1d', range: '6mo' };
    case '1Y':  return { interval: '1d', range: '1y' };
    case 'ALL': return { interval: '1mo', range: 'max' };
  }
}

export function getMarketFreshness(
  hasData: boolean,
  lastQuoteUpdated: Date | null,
  now = Date.now(),
): MarketFreshness {
  if (!hasData) return 'unavailable';
  if (!lastQuoteUpdated || now - lastQuoteUpdated.getTime() > PRICE_STALE_AFTER_MS) return 'stale';
  return 'live';
}

async function fetchHistoricalPrices(range: TimeRange): Promise<GoldPrice[] | null> {
  const { interval, range: r } = getYahooParams(range);

  try {
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
    const quotes = result.indicators?.quote?.[0];
    const closes: (number | null)[] = quotes?.close;
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
    if (range === '7D' && points.length > 0) {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const filtered = points.filter(p => p.timestamp >= sevenDaysAgo);
      if (filtered.length > 0) return filtered;
    }
    return points.length > 0 ? points : null;
  } catch {
    return null;
  }
}

async function fetchCurrentPrice(): Promise<number | null> {
  try {
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yahoo-finance?mode=quote`;
    const res = await fetch(fnUrl, {
      headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const data = await res.json();
    const price = data?.price;
    if (typeof price === 'number' && price > 0) {
      return Math.round((price / OZ_TO_GRAM) * 100) / 100;
    }
  } catch {
    return null;
  }
  return null;
}

export function useGoldPrice() {
  const [prices, setPrices] = useState<GoldPrice[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [lastQuoteUpdated, setLastQuoteUpdated] = useState<Date | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [timeRange, setTimeRange] = useState<TimeRange>('7D');

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      setLoading(true);
      const [historical, price] = await Promise.all([
        fetchHistoricalPrices(timeRange),
        fetchCurrentPrice(),
      ]);
      if (cancelled) return;

      const fetchedAt = new Date();
      if (price !== null) {
        setCurrentPrice(price);
        setLastQuoteUpdated(fetchedAt);
      }

      if (historical && historical.length > 0) {
        const points = [...historical];
        if (price !== null) {
          const nowMs = fetchedAt.getTime();
          const lastHistTs = points[points.length - 1].timestamp;
          if (nowMs > lastHistTs) {
            points.push({ timestamp: nowMs, price });
          } else {
            points[points.length - 1] = { ...points[points.length - 1], price };
          }
        }
        setPrices(points);
        if (price === null) setCurrentPrice(points[points.length - 1].price);
      }

      setLoading(false);
    }
    void loadHistory();
    return () => { cancelled = true; };
  }, [timeRange]);

  const fetchPrice = useCallback(async () => {
    const price = await fetchCurrentPrice();
    if (price === null) return;

    const fetchedAt = new Date();
    const nowMs = fetchedAt.getTime();
    setCurrentPrice(price);
    setLastQuoteUpdated(fetchedAt);
    setPrices(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, timestamp: nowMs, price }];
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => { void fetchPrice(); }, 10_000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  useEffect(() => {
    const interval = setInterval(() => setClockNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, []);

  const freshness = getMarketFreshness(
    currentPrice > 0 || prices.length > 0,
    lastQuoteUpdated,
    clockNow,
  );

  return { prices, currentPrice, loading, lastUpdated: lastQuoteUpdated, freshness, refetch: fetchPrice, timeRange, setTimeRange };
}
