import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/lib/i18n';
import { useTrades } from '@/hooks/use-trades';

const mocks = vi.hoisted(() => {
  const existingTrade = { id: 'trade-1', date: '2026-10-12', price: 90, quantity: 2, currency: 'USD' };
  const restoredTrade = { id: 'trade-restored', date: '2026-10-12', price: 90, quantity: 2, currency: 'USD' };
  const order = vi.fn(async () => ({ data: [existingTrade], error: null }));
  const single = vi.fn(async () => ({ data: restoredTrade, error: null }));
  const eq = vi.fn(async () => ({ error: null }));
  const select = vi.fn(() => ({ order, single }));
  const insertSelect = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select: insertSelect }));
  const deleteQuery = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select, insert, delete: deleteQuery }));
  const toast = vi.fn();
  const user = { id: 'user-1' };
  return { existingTrade, restoredTrade, order, single, eq, select, insertSelect, insert, deleteQuery, from, toast, user };
});

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function wrapper({ children }: { children: ReactNode }): ReactElement {
  return <I18nProvider>{children}</I18nProvider>;
}

describe('useTrades deletion undo', () => {
  it('restores a deleted trade through the existing insert flow when Undo is activated', async () => {
    localStorage.setItem('gold-lang', 'en');
    const { result } = renderHook(() => useTrades(), { wrapper });
    await waitFor(() => expect(result.current.trades).toHaveLength(1));

    await act(async () => {
      await result.current.deleteTrade('trade-1');
    });
    expect(result.current.trades).toHaveLength(0);

    const deleteToast = mocks.toast.mock.calls.find(([options]) => options.title === 'Trade deleted')?.[0];
    const undoAction = deleteToast?.action as ReactElement<{ onClick: () => void }> | undefined;
    expect(undoAction).toBeDefined();

    await act(async () => {
      undoAction?.props.onClick();
    });
    await waitFor(() => expect(result.current.trades).toEqual([
      { id: 'trade-restored', date: '2026-10-12', price: 90, quantity: 2, currency: 'USD' },
    ]));

    expect(mocks.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      date: '2026-10-12',
      price: 90,
      quantity: 2,
      currency: 'USD',
    });
  });
});
