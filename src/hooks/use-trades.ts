import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { GoldTrade } from '@/lib/gold-types';
import { useAuth } from './use-auth';
import { useToast } from '@/hooks/use-toast';

export function useTrades() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trades, setTrades] = useState<GoldTrade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    if (!user) { setTrades([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        toast({
          title: "Error fetching trades",
          description: error.message || "Failed to load trades.",
          variant: "destructive",
        });
      } else if (data) {
        setTrades(data.map(r => ({
          id: r.id,
          date: r.date,
          price: Number(r.price),
          quantity: Number(r.quantity),
          currency: r.currency as GoldTrade['currency'],
        })));
      }
    } catch (err: any) {
      toast({
        title: "Error fetching trades",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const addTrade = async (trade: Omit<GoldTrade, 'id'>) => {
    if (!user) return { success: false };
    try {
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
        
      if (error) {
        toast({
          title: "Failed to add trade",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
        return { success: false };
      }
      
      if (data) {
        setTrades(prev => [{
          id: data.id,
          date: data.date,
          price: Number(data.price),
          quantity: Number(data.quantity),
          currency: data.currency as GoldTrade['currency'],
        }, ...prev]);
        toast({
          title: "Trade added",
          description: "Your trade was successfully added.",
        });
        return { success: true };
      }
      return { success: false };
    } catch (err: any) {
      toast({
        title: "Failed to add trade",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  const deleteTrade = async (id: string) => {
    try {
      const { error } = await supabase.from('trades').delete().eq('id', id);
      if (error) {
        toast({
          title: "Failed to delete trade",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
        return { success: false };
      }
      
      setTrades(prev => prev.filter(t => t.id !== id));
      toast({
        title: "Trade deleted",
        description: "Your trade was successfully removed.",
      });
      return { success: true };
    } catch (err: any) {
      toast({
        title: "Failed to delete trade",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  return { trades, addTrade, deleteTrade, loading };
}
