import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WeightUnit, Currency, GoldTrade } from '@/lib/gold-types';
import { Plus } from 'lucide-react';

interface Props {
  onAdd: (trade: Omit<GoldTrade, 'id'>) => void;
  currentPrice: number;
}

export function AddTradeForm({ onAdd, currentPrice }: Props) {
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<WeightUnit>('g');
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
      unit,
      currency,
    });
    setPrice('');
    setQuantity('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex-1 min-w-[120px]">
        <label className="text-xs text-muted-foreground mb-1 block">买入价 (每盎司)</label>
        <Input
          type="number"
          step="0.01"
          placeholder={currentPrice ? `当前 $${currentPrice.toFixed(2)}` : '价格'}
          value={price}
          onChange={e => setPrice(e.target.value)}
          className="bg-secondary border-border font-mono"
        />
      </div>
      <div className="flex-1 min-w-[100px]">
        <label className="text-xs text-muted-foreground mb-1 block">数量</label>
        <Input
          type="number"
          step="0.01"
          placeholder="数量"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="bg-secondary border-border font-mono"
        />
      </div>
      <div className="w-20">
        <label className="text-xs text-muted-foreground mb-1 block">单位</label>
        <Select value={unit} onValueChange={v => setUnit(v as WeightUnit)}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="g">克 (g)</SelectItem>
            <SelectItem value="oz">盎司 (oz)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-24">
        <label className="text-xs text-muted-foreground mb-1 block">货币</label>
        <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="CNY">CNY</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="w-4 h-4 mr-1" />
        添加
      </Button>
    </form>
  );
}
