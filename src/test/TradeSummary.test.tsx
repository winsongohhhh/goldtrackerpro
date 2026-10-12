import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TradeSummary } from '@/components/TradeSummary';
import { I18nProvider } from '@/lib/i18n';
import type { GoldTrade } from '@/lib/gold-types';

const longTrade: GoldTrade = {
  id: 'trade-long',
  date: '2026-10-12',
  price: 1,
  quantity: 123456789012345.6,
  currency: 'USD',
};

afterEach(cleanup);
beforeEach(() => localStorage.setItem('gold-lang', 'en'));

describe('TradeSummary', () => {
  it('keeps a long total holding quantity visible with wrapping styles', () => {
    render(
      <I18nProvider>
        <TradeSummary
          trades={[longTrade]}
          currentPrice={1}
          convert={value => value}
          displayCurrency="USD"
          unit="g"
        />
      </I18nProvider>,
    );

    const quantity = screen.getByText('123456789012345.6', { exact: false });
    expect(quantity).toBeInTheDocument();
    expect(quantity).toHaveTextContent('123456789012345.6 g');
    expect(quantity.className).toContain('break-all');
    expect(quantity.className).toContain('[overflow-wrap:anywhere]');
    expect(quantity.className).not.toContain('truncate');
  });
});
