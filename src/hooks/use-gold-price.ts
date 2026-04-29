import { useState, useEffect, useCallback } from 'react';
import type { GoldPrice } from '@/lib/gold-types';

export type TimeRange = '7D' | '1M' | '6M' | '1Y' | 'ALL';

interface YahooParams {
  interval: string;
  range: string;
}

function getYahooParams(range: TimeRange): YahooParams {
  switch (range) {
    case '7D':  return { interval: '15m', range: '1mo' };
    case '1M':  return { interval: '1h',  range: '1mo' };
    case '6M':  return { interval: '1d',  range: '6mo' };
    case '1Y':  return { interval: '1d',  range: '1y' };
    case 'ALL': return { interval: '1mo', range: 'max' };
  }
}

/** Get NY timezone offset from UTC in seconds (handles DST automatically) */
function getNYOffset(): number {
  const now = new Date();
  const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC' });
  const nyStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  return Math.round((new Date(nyStr).getTime() - new Date(utcStr).getTime()) / 1000);
}

/** Shift a UTC unix timestamp (seconds) to display as NY time in the chart */
function toNYTimestamp(utcSeconds: number): number {
  return utcSeconds + getNYOffset();
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
    const highs: (number | null)[] = quotes?.high;
    const lows: (number | null)[] = quotes?.low;
    if (!timestamps || !closes) return null;

    const points: GoldPrice[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      const high = highs?.[i];
      const low = lows?.[i];
      if (close != null && close > 0) {
        points.push({
          timestamp: toNYTimestamp(timestamps[i]) * 1000,
          price: Math.round(close * 100) / 100,
        });
      }
    }
    // Filter to exact range for 7D
    if (range === '7D' && points.length > 0) {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const filtered = points.filter(p => p.timestamp >= sevenDaysAgo);
      if (filtered.length > 0) return filtered;
    }
    if (points.length > 0) return points;
  } catch {
    // fallback
  }

  return null;
}

async function fetchCurrentPrice(): Promise<number | null> {
  try {
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yahoo-finance?mode=quote`;
    const res = await fetch(fnUrl, {
      headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      const price = data?.price;
      if (typeof price === 'number' && price > 0) {
        return Math.round(price * 100) / 100;
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
  const [timeRange, setTimeRange] = useState<TimeRange>('7D');

  // Fetch current price immediately on mount to avoid delay
  useEffect(() => {
    fetchCurrentPrice().then(price => {
      if (price) setCurrentPrice(price);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      setLoading(true);

      // Fetch current price and history in parallel for instant display
      const [historical, price] = await Promise.all([
        fetchHistoricalPrices(timeRange),
        fetchCurrentPrice(),
      ]);
      if (cancelled) return;

      if (price) setCurrentPrice(price);

      if (historical && historical.length > 0) {
        // Append current live price as the last data point
        if (price && price > 0) {
          const nyTs = toNYTimestamp(Math.floor(Date.now() / 1000)) * 1000;
          const lastHistTs = historical[historical.length - 1].timestamp;
          if (nyTs > lastHistTs) {
            historical.push({ timestamp: nyTs, price });
          } else {
            historical[historical.length - 1].price = price;
          }
        }
        setPrices(historical);
        if (!price) setCurrentPrice(historical[historical.length - 1].price);
      }
      setLoading(false);
      setLastUpdated(new Date());
    }
    loadHistory();
    return () => { cancelled = true; };
  }, [timeRange]);

  const fetchPrice = useCallback(async () => {
    const price = await fetchCurrentPrice();
    if (price) {
      setCurrentPrice(price);
      const nyTs = toNYTimestamp(Math.floor(Date.now() / 1000)) * 1000;
      // Update last point's price in-place for real-time tail
      setPrices(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { ...last, timestamp: nyTs, price }];
      });
      setLastUpdated(new Date());
    }
  }, [timeRange]);

  useEffect(() => {
    // Start fetching immediately, then every second
    fetchPrice();
    const interval = setInterval(fetchPrice, 1000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  return { prices, currentPrice, loading, lastUpdated, refetch: fetchPrice, timeRange, setTimeRange };
}
