import { useState, useEffect, useCallback, useRef } from 'react';
import type { GoldPrice } from '@/lib/gold-types';

const OZ_TO_GRAM = 31.1035;

/** Fetch real intraday gold data from Yahoo Finance (GC=F gold futures) */
async function fetchHistoricalPrices(): Promise<GoldPrice[] | null> {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=5m&range=1d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
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
    return points.length > 0 ? points : null;
  } catch {
    return null;
  }
}

/** Fetch current spot price */
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

  // Fallback: try Yahoo Finance last close
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice > 0) {
        return Math.round((meta.regularMarketPrice / OZ_TO_GRAM) * 100) / 100;
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
  const historyLoadedRef = useRef(false);

  // Load historical data once on mount
  useEffect(() => {
    async function loadHistory() {
      const historical = await fetchHistoricalPrices();
      if (historical && historical.length > 0) {
        setPrices(historical);
        setCurrentPrice(historical[historical.length - 1].price);
        historyLoadedRef.current = true;
      }
      setLoading(false);
      setLastUpdated(new Date());
    }
    loadHistory();
  }, []);

  // Poll current price every 10s and append to chart
  const fetchPrice = useCallback(async () => {
    const price = await fetchCurrentPrice();
    if (price) {
      setCurrentPrice(price);
      setPrices(prev => {
        const newPoint: GoldPrice = { timestamp: Date.now(), price };
        const updated = [...prev, newPoint];
        return updated.slice(-200);
      });
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchPrice, 10000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  return { prices, currentPrice, loading, lastUpdated, refetch: fetchPrice };
}
