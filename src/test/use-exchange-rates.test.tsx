import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FALLBACK_RATES, useExchangeRates } from '@/hooks/use-exchange-rates';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useExchangeRates freshness', () => {
  it('marks fallback rates stale when the FX request fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useExchangeRates());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(result.current.rates).toEqual(FALLBACK_RATES);
    expect(result.current.freshness).toBe('stale');
    expect(result.current.lastUpdated).toBeNull();
  });

  it('accepts only complete positive rates and records the successful fetch time', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { USD: 1, CNY: 7.1, EUR: 0.93, MYR: 4.5, SGD: 1.35 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useExchangeRates());
    await waitFor(() => expect(result.current.freshness).toBe('live'));

    expect(result.current.rates).toEqual({ USD: 1, CNY: 7.1, EUR: 0.93, MYR: 4.5, SGD: 1.35 });
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
    expect(result.current.convert(10, 'MYR')).toBe(45);
  });

  it('does not treat a partial fallback response as a fresh rate update', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { USD: 1, MYR: 4.5 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useExchangeRates());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(result.current.freshness).toBe('stale');
    expect(result.current.lastUpdated).toBeNull();
    expect(result.current.rates).toEqual(FALLBACK_RATES);
  });
});
