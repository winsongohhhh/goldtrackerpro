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
  it('keeps a long holding quantity on one line and exposes its full value accessibly', () => {
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

    const row = screen.getByRole('listitem');
    const quantity = screen.getByText('123.5T g');
    const price = screen.getByText('$75.00/g');

    expect(row.className).toContain('flex-nowrap');
    expect(quantity.className).toContain('whitespace-nowrap');
    expect(quantity).toHaveAttribute('aria-label', '123456789012345.6 g');
    expect(price).toHaveAttribute('aria-label', '$75.00 USD/g');
  });

  it('compacts long MYR and ounce values without wrapping or removing full accessible amounts', () => {
    const trade: GoldTrade = {
      id: 'trade-myr-ounce',
      date: '2026-10-12',
      price: 2500,
      quantity: 31.1035 * 1234.5,
      currency: 'MYR',
    };

    render(
      <I18nProvider>
        <TradeList
          trades={[trade]}
          currentPrice={80}
          onDelete={async () => ({ success: true })}
          convert={(value, currency) => currency === 'MYR' ? value * 4.5 : value}
          displayCurrency="MYR"
          unit="oz"
        />
      </I18nProvider>,
    );

    const row = screen.getByRole('listitem');
    const price = screen.getByText(/77\.76K\/oz/);
    const quantity = screen.getByText('1.235K oz');
    const accessibleValue = screen.getByText(/^Value:/);

    expect(row.className).toContain('flex-nowrap');
    expect(price.className).toContain('whitespace-nowrap');
    expect(quantity.className).toContain('whitespace-nowrap');
    expect(price).toHaveAttribute('aria-label', 'RM 77,758.75 MYR/oz');
    expect(quantity).toHaveAttribute('aria-label', '1234.5 oz');
    expect(accessibleValue).toHaveClass('sr-only');
  });

  it('shows a complete English date without truncation or a hover-only tooltip', () => {
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

    const date = screen.getByLabelText('12 October 2026');
    expect(date.tagName).toBe('TIME');
    expect(date).toHaveAttribute('dateTime', '2026-10-12');
    expect(date).toHaveTextContent('12 Oct 2026');
    expect(date.className).not.toMatch(/truncate|hidden/);
  });

  it('formats transaction dates in the selected Chinese locale', () => {
    localStorage.setItem('gold-lang', 'cn');
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

    const date = screen.getByLabelText('2026年10月12日');
    expect(date).toHaveTextContent('2026/10/12');
    expect(date).toHaveAttribute('dateTime', '2026-10-12');
  });
});
