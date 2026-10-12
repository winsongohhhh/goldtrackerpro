import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TradeList } from '@/components/TradeList';
import { I18nProvider } from '@/lib/i18n';
import type { GoldTrade } from '@/lib/gold-types';

const longTrade: GoldTrade = {
  id: 'trade-long',
  date: '2026-10-12',
  price: 75,
  quantity: 123456789012345.6,
  currency: 'USD',
};

afterEach(cleanup);
beforeEach(() => localStorage.setItem('gold-lang', 'en'));

describe('TradeList', () => {
  it('renders a long holding quantity with wrapping styles rather than clipping it', () => {
    render(
      <I18nProvider>
        <TradeList
          trades={[longTrade]}
          currentPrice={80}
          onDelete={async () => ({ success: true })}
          convert={value => value}
          displayCurrency="USD"
          unit="g"
        />
      </I18nProvider>,
    );

    const quantity = screen.getByText('123456789012345.6 g');
    expect(quantity).toBeInTheDocument();
    expect(quantity.className).toContain('break-all');
    expect(quantity.className).toContain('[overflow-wrap:anywhere]');
    expect(screen.getByText('$75.00 USD/g')).toBeInTheDocument();
  });
});
