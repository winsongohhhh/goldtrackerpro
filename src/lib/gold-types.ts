export type Currency = 'USD' | 'CNY' | 'EUR' | 'MYR';

export interface GoldTrade {
  id: string;
  date: string;
  price: number;    // price per gram in trade currency
  quantity: number;  // grams
  currency: Currency;
}

export interface GoldPrice {
  timestamp: number;
  price: number; // USD per gram
}

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'USD',
  CNY: 'CNY',
  EUR: 'EUR',
  MYR: 'MYR',
};

export function formatCurrency(value: number, currency: Currency): string {
  const locale = currency === 'CNY' ? 'zh-CN' : currency === 'MYR' ? 'ms-MY' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}
