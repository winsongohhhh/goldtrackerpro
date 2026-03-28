import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Currency, GoldTrade, WeightUnit } from '@/lib/gold-types';
import { priceForUnit, quantityForUnit } from '@/lib/gold-types';
import { Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Props {
  onAdd: (trade: Omit<GoldTrade, 'id'>) => void;
  currentPrice: number; // USD per gram
  convert: (usd: number, to: Currency) => number;
  displayCurrency: Currency;
  unit: WeightUnit;
}

export function AddTradeForm({ onAdd, currentPrice, convert, displayCurrency, unit }: Props) {
  const { t } = useI18n();
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [currency, setCurrency] = useState<Currency>(displayCurrency);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(price);
    const q = parseFloat(quantity);
    if (isNaN(p) || isNaN(q) || q <= 0) return;

    // Convert input price (per unit) to per gram, and quantity to grams
    const pricePerGram = unit === 'oz' ? p / 31.1035 : p;
    const quantityGrams = unit === 'oz' ? q * 31.1035 : q;

    onAdd({
      date: new Date().toISOString().split('T')[0],
      price: Math.round(pricePerGram * 100) / 100,
      quantity: Math.round(quantityGrams * 100) / 100,
      currency,
    });
    setPrice('');
    setQuantity('');
  };

  const displayCurrentPrice = priceForUnit(convert(currentPrice, currency), unit);
  const unitLabel = unit === 'oz' ? 'oz' : 'g';

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="w-24">
        <label className="text-xs text-muted-foreground mb-1 block">{t.currency}</label>
        <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="CNY">CNY</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="MYR">MYR</SelectItem>
            <SelectItem value="SGD">SGD</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 min-w-[120px]">
        <label className="text-xs text-muted-foreground mb-1 block">
          {t.buyPrice} (/{unitLabel})
        </label>
        <Input
          type="number"
          step="0.01"
          placeholder={currentPrice ? `${t.currentPrice} ${displayCurrentPrice.toFixed(2)}/${unitLabel}` : t.price}
          value={price}
          onChange={e => setPrice(e.target.value)}
          className="bg-secondary border-border font-mono"
        />
      </div>
      <div className="flex-1 min-w-[100px]">
        <label className="text-xs text-muted-foreground mb-1 block">
          {t.quantity} ({unitLabel})
        </label>
        <Input
          type="number"
          step="0.01"
          placeholder={unitLabel}
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="bg-secondary border-border font-mono"
        />
      </div>
      <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="w-4 h-4 mr-1" />
        {t.add}
      </Button>
    </form>
  );
}
