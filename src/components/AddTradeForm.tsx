import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Currency, GoldTrade, WeightUnit } from '@/lib/gold-types';
import { OZ_TO_GRAM, priceBasisLabel, priceForUnit, weightUnitLabel, weightUnitOptionLabel } from '@/lib/gold-types';
import { Loader2, Plus } from 'lucide-react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionAnnouncement, setSubmissionAnnouncement] = useState('');

  useEffect(() => setCurrency(displayCurrency), [displayCurrency]);
  useEffect(() => setTradeUnit(unit), [unit]);

  const displayCurrentPrice = priceForUnit(convert(currentPrice, currency), tradeUnit);
  const unitLabel = weightUnitLabel(tradeUnit);
  const priceBasis = priceBasisLabel(currency, tradeUnit);

  const handleQuickMarketFill = () => {
    if (currentPrice > 0) setPrice(displayCurrentPrice.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(price);
    const q = parseFloat(quantity);
    if (!Number.isFinite(p) || !Number.isFinite(q) || p <= 0 || q <= 0 || isSubmitting) return;

    // Convert input price (per unit) to per gram, and quantity to grams.
    const pricePerGram = tradeUnit === 'oz' ? p / OZ_TO_GRAM : p;
    const quantityGrams = tradeUnit === 'oz' ? q * OZ_TO_GRAM : q;

    setIsSubmitting(true);
    setSubmissionAnnouncement(t.tradeAdding);
    try {
      const today = new Date();
      const result = await onAdd({
        date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
        price: pricePerGram,
        quantity: quantityGrams,
        currency,
      });

      if (!result?.success) {
        setSubmissionAnnouncement(t.tradeAddFailedAnnouncement);
        return;
      }
      setPrice('');
      setQuantity('');
      setSubmissionAnnouncement(t.tradeAddedAnnouncement);
    } catch {
      setSubmissionAnnouncement(t.tradeAddFailedAnnouncement);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section aria-label={t.addTradeTitle} className="apple-card dashboard-card p-4 sm:p-5 lg:p-4 flex flex-col h-full">
      <div className="flex min-h-0 flex-1 flex-col lg:-translate-y-3">
        <div className="flex items-center justify-between pb-1 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E5A93C]" aria-hidden="true" />
            <h2 className="dashboard-card-title text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.addTradeTitle}
            </h2>
          </div>
          {currentPrice > 0 && (
            <button
              type="button"
              onClick={handleQuickMarketFill}
              className="min-h-11 px-2 text-xs text-[#E5A93C] hover:text-[#F5D285] font-medium transition-colors"
            >
              {t.quickMarketBuy}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto flex-1 flex flex-col justify-center gap-4 py-2" aria-label={t.addTradeTitle}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div className="min-w-0">
            <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">
              {t.settlementCurrency}
            </label>
            <Select value={currency} onValueChange={v => setCurrency(v as Currency)}>
              <SelectTrigger aria-label={t.settlementCurrency} className="bg-black/30 border border-white/[0.08] rounded-xl h-10 text-xs text-white focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1C1C1E] border-white/10 text-white">
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="CNY">CNY (¥)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="MYR">MYR (RM)</SelectItem>
                <SelectItem value="SGD">SGD (S$)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <label className="text-[11px] text-muted-foreground mb-1.5 block font-medium">
              {t.measuringUnit}
            </label>
            <Select value={tradeUnit} onValueChange={v => setTradeUnit(v as WeightUnit)}>
              <SelectTrigger aria-label={t.measuringUnit} className="bg-black/30 border border-white/[0.08] rounded-xl h-10 text-xs text-white focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1C1C1E] border-white/10 text-white">
                <SelectItem value="g">{weightUnitOptionLabel('g')}</SelectItem>
                <SelectItem value="oz">{weightUnitOptionLabel('oz')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <label htmlFor="trade-buy-price" className="text-[11px] text-muted-foreground mb-1.5 block font-medium">
              {t.buyUnitPrice} ({priceBasis})
            </label>
            <Input
              id="trade-buy-price"
              type="number"
              min="0.01"
              step="0.01"
              placeholder={currentPrice ? `${displayCurrentPrice.toFixed(2)}` : t.price}
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
              className="bg-black/30 border border-white/[0.08] rounded-xl h-10 text-xs font-mono text-white placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="min-w-0">
            <label htmlFor="trade-quantity" className="text-[11px] text-muted-foreground mb-1.5 block font-medium">
              {t.tradeQuantity} ({unitLabel})
            </label>
            <Input
              id="trade-quantity"
              type="number"
              min="0.01"
              step="0.01"
              placeholder={unitLabel}
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              required
              className="bg-black/30 border border-white/[0.08] rounded-xl h-10 text-xs font-mono text-white placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="w-full apple-btn-primary h-10 rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Plus className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />}
            {isSubmitting ? t.tradeAdding : t.addRecordBtn}
          </Button>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {submissionAnnouncement}
          </p>
        </form>
      </div>
    </section>
  );
}
