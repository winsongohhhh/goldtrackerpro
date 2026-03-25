export type WeightUnit = 'g' | 'oz';
export type Currency = 'USD' | 'CNY' | 'EUR';

export interface GoldTrade {
  id: string;
  date: string;
  price: number;
  quantity: number;
  unit: WeightUnit;
  currency: Currency;
}

export interface GoldPrice {
  timestamp: number;
  price: number;
}

export const OZ_TO_GRAM = 31.1035;

export function convertToGrams(quantity: number, unit: WeightUnit): number {
  return unit === 'oz' ? quantity * OZ_TO_GRAM : quantity;
}

export function convertFromGrams(grams: number, unit: WeightUnit): number {
  return unit === 'oz' ? grams / OZ_TO_GRAM : grams;
}

export function formatCurrency(value: number, currency: Currency): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}
