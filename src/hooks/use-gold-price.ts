import { useState, useEffect, useCallback, useRef } from 'react';
import type { GoldPrice } from '@/lib/gold-types';

const OZ_TO_GRAM = 31.1035;

function generateSimulatedPrices(basePrice: number): GoldPrice[] {
  const now = Date.now();
  const points: GoldPrice[] = [];
  for (let i = 47; i >= 0; i--) {
    const timestamp = now - i * 30 * 60 * 1000;
    const noise = (Math.sin(i * 0.5) * 0.5) + (Math.random() - 0.5) * 0.3;
    points.push({
      timestamp,
      price: Math.round((basePrice + noise) * 100) / 100,
    });
  }
  return points;
}

async function fetchGoldPrice(): Promise<number | null> {
  try {
    const res = await fetch('https://api.gold-api.com/price/XAU');
    if (res.ok) {
      const data = await res.json();
      // price is per oz, convert to per gram
      if (typeof data?.price === 'number' && data.price > 0) {
        return Math.round((data.price / OZ_TO_GRAM) * 100) / 100;
      }
    }
  } catch {
    // fallback
  }
  return null;
}

export function useGoldPrice() {
  const [prices, setPrices] = useState<GoldPrice[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const initializedRef = useRef(false);

  const fetchPrice = useCallback(async () => {
    const price = await fetchGoldPrice();

    if (price) {
      setCurrentPrice(price);
      setPrices(prev => {
        if (prev.length === 0 && !initializedRef.current) {
          initializedRef.current = true;
          return generateSimulatedPrices(price);
        }
        const newPoint: GoldPrice = { timestamp: Date.now(), price };
        const updated = [...prev, newPoint];
        return updated.slice(-120);
      });
      setLastUpdated(new Date());
      setLoading(false);
      return;
    }

    // Full fallback with simulated data
    if (!initializedRef.current) {
      initializedRef.current = true;
      const basePrice = 97; // ~$3020/oz in $/g
      const simulated = generateSimulatedPrices(basePrice);
      setPrices(simulated);
      setCurrentPrice(simulated[simulated.length - 1].price);
    } else {
      setPrices(prev => {
        const lastPrice = prev[prev.length - 1]?.price ?? 97;
        const newPrice = lastPrice + (Math.random() - 0.5) * 0.1;
        const point: GoldPrice = { timestamp: Date.now(), price: Math.round(newPrice * 100) / 100 };
        setCurrentPrice(point.price);
        return [...prev, point].slice(-120);
      });
    }
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 10000); // every 10 seconds
    return () => clearInterval(interval);
  }, [fetchPrice]);

  return { prices, currentPrice, loading, lastUpdated, refetch: fetchPrice };
}
