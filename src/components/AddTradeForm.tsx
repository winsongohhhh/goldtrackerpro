import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Currency, GoldTrade, WeightUnit } from '@/lib/gold-types';
import { priceForUnit } from '@/lib/gold-types';
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

  const displayCurrentPrice = priceForUnit(convert(currentPrice, currency), tradeUnit);
  const unitLabel = tradeUnit === 'oz' ? 'oz' : 'g';

  const handleQuickMarketFill = () => {
    if (currentPrice > 0) {
      setPrice(displayCurrentPrice.toFixed(2));
    }
  };

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

  return (
    <section className="bg-[#13161B] border border-white/[0.06] rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 h-full flex flex-col justify-between">
      {/* ── Card Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <h2 className="text-sm font-semibold text-white">
            {t.addTradeTitle}
          </h2>
        </div>
        {currentPrice > 0 && (
          <button
            type="button"
            onClick={handleQuickMarketFill}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            {t.quickMarketBuy}
          </button>
        )}
      </div>

      {/* ── Form Inputs 2×2 Grid ───────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between pt-1">
        <div className="grid grid-cols-2 gap-3">
          {/* Row 1: Currency */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">
              {t.settlementCurrency}
            </label>
            <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
              <SelectTrigger className="bg-[#0E1115] border border-white/[0.06] rounded-xl h-10 text-xs text-white focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="CNY">CNY (¥)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="MYR">MYR (RM)</SelectItem>
                <SelectItem value="SGD">SGD (S$)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 1: Unit */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">
              {t.measuringUnit}
            </label>
            <Select value={tradeUnit} onValueChange={v => setTradeUnit(v as WeightUnit)}>
              <SelectTrigger className="bg-[#0E1115] border border-white/[0.06] rounded-xl h-10 text-xs text-white focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="g">g ({t.perGram.replace('/', '')})</SelectItem>
                <SelectItem value="oz">oz ({t.perOz.replace('/', '')})</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Buy Price */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">
              {t.buyUnitPrice} (/{unitLabel})
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder={currentPrice ? `${displayCurrentPrice.toFixed(2)}` : t.price}
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="bg-[#0E1115] border border-white/[0.06] rounded-xl h-10 text-xs font-mono text-white placeholder:text-muted-foreground/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Row 2: Quantity */}
          <div>
            <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">
              {t.tradeQuantity} ({unitLabel})
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder={unitLabel}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="bg-[#0E1115] border border-white/[0.06] rounded-xl h-10 text-xs font-mono text-white placeholder:text-muted-foreground/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* ── Submit CTA Button ──────────────────────────────── */}
        <Button
          type="submit"
          className="w-full bg-[#F3BA2F] hover:bg-[#F3BA2F]/90 text-black font-bold h-10 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          {t.addRecordBtn}
        </Button>
      </form>
    </section>
  );
}
