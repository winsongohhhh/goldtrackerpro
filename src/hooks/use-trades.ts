import { useState, useEffect } from 'react';
import type { GoldTrade } from '@/lib/gold-types';

const STORAGE_KEY = 'gold-trades';

export function useTrades() {
  const [trades, setTrades] = useState<GoldTrade[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  const addTrade = (trade: Omit<GoldTrade, 'id'>) => {
    const newTrade: GoldTrade = {
      ...trade,
      id: crypto.randomUUID(),
    };
    setTrades(prev => [newTrade, ...prev]);
  };

  const deleteTrade = (id: string) => {
    setTrades(prev => prev.filter(t => t.id !== id));
  };

  return { trades, addTrade, deleteTrade };
}
