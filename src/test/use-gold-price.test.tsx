import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMarketFreshness, PRICE_STALE_AFTER_MS, useGoldPrice } from '@/hooks/use-gold-price';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useGoldPrice freshness', () => {
  it('keeps failed fetches unavailable and does not advance the update timestamp', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useGoldPrice());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchMock).toHaveBeenCalled();
    expect(result.current.freshness).toBe('unavailable');
    expect(result.current.lastUpdated).toBeNull();
  });

  it('does not label history as a fresh quote when only the historical request succeeds', async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      if (String(input).includes('mode=quote')) return Promise.resolve({ ok: false });
      return Promise.resolve({
        ok: true,
        json: async () => ({
          chart: {
            result: [{
              timestamp: [Math.floor(Date.now() / 1000)],
              indicators: { quote: [{ close: [3000] }] },
            }],
          },
        }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useGoldPrice());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.prices).toHaveLength(1);
    expect(result.current.currentPrice).toBeGreaterThan(0);
    expect(result.current.lastUpdated).toBeNull();
    expect(result.current.freshness).toBe('stale');
  });

  it('treats a fresh successful quote as live and the same quote as stale after the threshold', () => {
    const fetchedAt = new Date('2026-10-12T10:00:00.000Z');

    expect(getMarketFreshness(true, fetchedAt, fetchedAt.getTime())).toBe('live');
    expect(getMarketFreshness(true, fetchedAt, fetchedAt.getTime() + PRICE_STALE_AFTER_MS + 1)).toBe('stale');
    expect(getMarketFreshness(false, null, fetchedAt.getTime())).toBe('unavailable');
  });
});
