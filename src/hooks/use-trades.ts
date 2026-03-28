import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { GoldTrade } from '@/lib/gold-types';
import { useAuth } from './use-auth';

export function useTrades() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<GoldTrade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    if (!user) { setTrades([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setTrades(data.map(r => ({
        id: r.id,
        date: r.date,
        price: Number(r.price),
        quantity: Number(r.quantity),
        currency: r.currency as GoldTrade['currency'],
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const addTrade = async (trade: Omit<GoldTrade, 'id'>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('trades')
      .insert({
        user_id: user.id,
        date: trade.date,
        price: trade.price,
        quantity: trade.quantity,
        currency: trade.currency,
      })
      .select()
      .single();
    if (!error && data) {
      setTrades(prev => [{
        id: data.id,
        date: data.date,
        price: Number(data.price),
        quantity: Number(data.quantity),
        currency: data.currency as GoldTrade['currency'],
      }, ...prev]);
    }
  };

  const deleteTrade = async (id: string) => {
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (!error) {
      setTrades(prev => prev.filter(t => t.id !== id));
    }
  };

  return { trades, addTrade, deleteTrade, loading };
}
