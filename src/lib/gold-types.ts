export type Currency = 'USD' | 'CNY' | 'EUR' | 'MYR' | 'SGD';
export type WeightUnit = 'g' | 'oz';

export const OZ_TO_GRAM = 31.1035;

export interface GoldTrade {
  id: string;
  date: string;
  price: number;    // price per gram in trade currency
  quantity: number;  // grams (always stored in grams)
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
  SGD: 'SGD',
};

export function formatCurrency(value: number, currency: Currency): string {
  const locale = currency === 'CNY' ? 'zh-CN' : currency === 'MYR' ? 'ms-MY' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

/** Convert a per-gram price to per-unit price */
export function priceForUnit(pricePerGram: number, unit: WeightUnit): number {
  return unit === 'oz' ? pricePerGram * OZ_TO_GRAM : pricePerGram;
}

/** Convert a gram quantity to display unit */
export function quantityForUnit(grams: number, unit: WeightUnit): number {
  return unit === 'oz' ? grams / OZ_TO_GRAM : grams;
}

/** Convert a display-unit quantity back to grams */
export function quantityToGrams(value: number, unit: WeightUnit): number {
  return unit === 'oz' ? value * OZ_TO_GRAM : value;
}
