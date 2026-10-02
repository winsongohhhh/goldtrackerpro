import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Currency, GoldTrade, WeightUnit } from '@/lib/gold-types';
import { priceForUnit, quantityForUnit } from '@/lib/gold-types';
import { Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Props {
  onAdd: (trade: Omit<GoldTrade, 'id'>) => Promise<{ success: boolean }>;
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
  const [tradeUnit, setTradeUnit] = useState<WeightUnit>(unit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(price);
    const q = parseFloat(quantity);
    if (isNaN(p) || isNaN(q) || q <= 0) return;

    // Convert input price (per unit) to per gram, and quantity to grams
    const pricePerGram = tradeUnit === 'oz' ? p / 31.1035 : p;
    const quantityGrams = tradeUnit === 'oz' ? q * 31.1035 : q;

    const result = await onAdd({
      date: new Date().toISOString().split('T')[0],
      price: Math.round(pricePerGram * 100) / 100,
      quantity: Math.round(quantityGrams * 100) / 100,
      currency,
    });

    if (result && result.success === false) {
      return;
    }
    
    setPrice('');
    setQuantity('');
  };

  const displayCurrentPrice = priceForUnit(convert(currentPrice, currency), tradeUnit);
  const unitLabel = tradeUnit === 'oz' ? 'oz' : 'g';

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t.currency}</label>
            <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
              <SelectTrigger className="bg-secondary border-border w-full">
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
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t.unit}</label>
            <Select value={tradeUnit} onValueChange={v => setTradeUnit(v as WeightUnit)}>
              <SelectTrigger className="bg-secondary border-border w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oz">oz</SelectItem>
                <SelectItem value="g">g</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {t.buyPrice} (/{unitLabel})
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder={currentPrice ? `${displayCurrentPrice.toFixed(2)}` : t.price}
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="bg-secondary border-border font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {t.quantity} ({unitLabel})
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder={unitLabel}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="bg-secondary border-border font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none w-full"
            />
          </div>
        </div>
      </div>
      <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 w-full mt-[20px] mb-[10px]">
        <Plus className="w-4 h-4 mr-1" />
        {t.add}
      </Button>
    </form>
  );
}
