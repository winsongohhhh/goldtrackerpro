import { createElement, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { GoldTrade } from '@/lib/gold-types';
import { useAuth } from './use-auth';
import { useToast } from '@/hooks/use-toast';
import { ToastAction, type ToastActionElement } from '@/components/ui/toast';
import { useI18n } from '@/lib/i18n';

function toGoldTrade(row: { id: string; date: string; price: number | string; quantity: number | string; currency: string }): GoldTrade {
  return {
    id: row.id,
    date: row.date,
    price: Number(row.price),
    quantity: Number(row.quantity),
    currency: row.currency as GoldTrade['currency'],
  };
}

export function useTrades() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const translationsRef = useRef(t);
  translationsRef.current = t;
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
          title: translationsRef.current.tradeFetchErrorTitle,
          description: translationsRef.current.tradeFetchErrorDescription,
          variant: 'destructive',
        });
      } else if (data) {
        setTrades(data.map(toGoldTrade));
      }
    } catch (err) {
      toast({
        title: translationsRef.current.tradeFetchErrorTitle,
        description: translationsRef.current.tradeFetchErrorDescription,
        variant: 'destructive',
      });
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => { void fetchTrades(); }, [fetchTrades]);

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
        toast({ title: t.tradeAddErrorTitle, description: t.tradeAddErrorDescription, variant: 'destructive' });
        return { success: false };
      }

      if (data) {
        setTrades(prev => [toGoldTrade(data), ...prev]);
        toast({ title: t.tradeAddedTitle, description: t.tradeAddedDescription });
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      toast({ title: t.tradeAddErrorTitle, description: t.tradeAddErrorDescription, variant: 'destructive' });
      return { success: false };
    }
  };

  const restoreTrade = async (trade: GoldTrade) => {
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

      if (error || !data) {
        toast({ title: t.tradeRestoreFailed, variant: 'destructive' });
        return { success: false };
      }

      const restored = toGoldTrade(data);
      setTrades(prev => [restored, ...prev.filter(existing => existing.id !== restored.id)]);
      toast({ title: t.tradeRestored });
      return { success: true };
    } catch {
      toast({ title: t.tradeRestoreFailed, variant: 'destructive' });
      return { success: false };
    }
  };

  const deleteTrade = async (id: string) => {
    const deletedTrade = trades.find(trade => trade.id === id);
    try {
      const { error } = await supabase.from('trades').delete().eq('id', id);
      if (error) {
        toast({ title: t.tradeDeleteErrorTitle, description: t.tradeDeleteErrorDescription, variant: 'destructive' });
        return { success: false };
      }

      setTrades(prev => prev.filter(trade => trade.id !== id));
      toast({
        title: t.tradeDeleted,
        description: t.tradeDeletedUndo,
        ...(deletedTrade && {
          action: createElement(
            ToastAction,
            { altText: t.undo, onClick: () => { void restoreTrade(deletedTrade); } },
            t.undo,
          ) as unknown as ToastActionElement,
        }),
      });
      return { success: true };
    } catch (err) {
      toast({ title: t.tradeDeleteErrorTitle, description: t.tradeDeleteErrorDescription, variant: 'destructive' });
      return { success: false };
    }
  };

  return { trades, addTrade, deleteTrade, restoreTrade, loading };
}
