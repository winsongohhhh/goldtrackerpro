import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Currency, GoldTrade } from '@/lib/gold-types';
import { Plus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Props {
  onAdd: (trade: Omit<GoldTrade, 'id'>) => void;
  currentPrice: number;
}

export function AddTradeForm({ onAdd, currentPrice }: Props) {
  const { t } = useI18n();
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(price);
    const q = parseFloat(quantity);
    if (isNaN(p) || isNaN(q) || q <= 0) return;

    onAdd({
      date: new Date().toISOString().split('T')[0],
      price: p,
      quantity: q,
      currency,
    });
    setPrice('');
    setQuantity('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[120px]">
        <label className="text-xs text-muted-foreground mb-1 block">{t.buyPrice}</label>
        <Input
          type="number"
          step="0.01"
          placeholder={currentPrice ? `${t.currentPrice} $${currentPrice.toFixed(2)}/g` : t.price}
          value={price}
          onChange={e => setPrice(e.target.value)}
          className="bg-secondary border-border font-mono"
        />
      </div>
      <div className="flex-1 min-w-[100px]">
        <label className="text-xs text-muted-foreground mb-1 block">{t.quantity}</label>
        <Input
          type="number"
          step="0.01"
          placeholder="g"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="bg-secondary border-border font-mono"
        />
      </div>
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
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="w-4 h-4 mr-1" />
        {t.add}
      </Button>
    </form>
  );
}
