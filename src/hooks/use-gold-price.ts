import { useState, useEffect, useCallback } from 'react';
import type { GoldPrice } from '@/lib/gold-types';

const METAL_PRICE_API = 'https://api.metalpriceapi.com/v1';

// Free fallback: use a simulated price based on real-ish data
function generateSimulatedPrices(): GoldPrice[] {
  const now = Date.now();
  const points: GoldPrice[] = [];
  const basePrice = 3020; // approximate current gold price USD/oz
  
  for (let i = 47; i >= 0; i--) {
    const timestamp = now - i * 30 * 60 * 1000; // every 30 min
    const noise = (Math.sin(i * 0.5) * 15) + (Math.random() - 0.5) * 10;
    points.push({
      timestamp,
      price: Math.round((basePrice + noise) * 100) / 100,
    });
  }
  return points;
}

export function useGoldPrice() {
  const [prices, setPrices] = useState<GoldPrice[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchPrice = useCallback(async () => {
    try {
      // Try fetching from a free gold price API
      const res = await fetch(
        'https://data-asg.goldprice.org/dbXRates/USD'
      );
      if (res.ok) {
        const data = await res.json();
        const pricePerOz = data?.items?.[0]?.xauPrice;
        if (pricePerOz && pricePerOz > 0) {
          setCurrentPrice(pricePerOz);
          setPrices(prev => {
            const newPoint: GoldPrice = { timestamp: Date.now(), price: pricePerOz };
            const updated = [...prev, newPoint];
            return updated.slice(-48);
          });
          setLastUpdated(new Date());
          setLoading(false);
          return;
        }
      }
    } catch {
      // fallback below
    }

    // Fallback to simulated data
    if (prices.length === 0) {
      const simulated = generateSimulatedPrices();
      setPrices(simulated);
      setCurrentPrice(simulated[simulated.length - 1].price);
    } else {
      const lastPrice = prices[prices.length - 1].price;
      const newPrice = lastPrice + (Math.random() - 0.5) * 5;
      const point: GoldPrice = { timestamp: Date.now(), price: Math.round(newPrice * 100) / 100 };
      setPrices(prev => [...prev, point].slice(-48));
      setCurrentPrice(point.price);
    }
    setLastUpdated(new Date());
    setLoading(false);
  }, [prices.length]);

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 60000); // every 60s
    return () => clearInterval(interval);
  }, []);

  return { prices, currentPrice, loading, lastUpdated, refetch: fetchPrice };
}
