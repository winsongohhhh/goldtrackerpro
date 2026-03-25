import type { GoldTrade, Currency } from '@/lib/gold-types';
import { convertToGrams, OZ_TO_GRAM, formatCurrency } from '@/lib/gold-types';
import { useI18n } from '@/lib/i18n';

interface Props {
  trades: GoldTrade[];
  currentPrice: number; // USD per oz
  convert: (usd: number, to: Currency) => number;
  displayCurrency: Currency;
}

export function TradeSummary({ trades, currentPrice, convert, displayCurrency }: Props) {
  const { t } = useI18n();
  if (trades.length === 0) return null;

  const totalGrams = trades.reduce((sum, t) => sum + convertToGrams(t.quantity, t.unit), 0);
  const totalOz = totalGrams / OZ_TO_GRAM;

  const totalCost = trades.reduce((sum, t) => {
    const pricePerOz = t.unit === 'g' ? t.price * OZ_TO_GRAM : t.price;
    const qtyOz = t.unit === 'g' ? t.quantity / OZ_TO_GRAM : t.quantity;
    return sum + pricePerOz * qtyOz;
  }, 0);

  const avgCostPerOz = totalCost / totalOz;
  const currentValue = currentPrice * totalOz;
  const totalPnL = currentValue - totalCost;
  const pnlPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  const isProfit = totalPnL >= 0;

  const dc = displayCurrency;

  const stats = [
    { label: t.totalHolding, value: `${totalGrams.toFixed(2)}g / ${totalOz.toFixed(4)}oz` },
    { label: t.avgCost, value: `${formatCurrency(convert(avgCostPerOz, dc), dc)}/oz` },
    { label: t.marketValue, value: formatCurrency(convert(currentValue, dc), dc) },
    {
      label: t.totalPnL,
      value: `${isProfit ? '+' : ''}${formatCurrency(convert(totalPnL, dc), dc)} (${isProfit ? '+' : ''}${pnlPercent.toFixed(2)}%)`,
      color: isProfit ? 'text-success' : 'text-destructive',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(s => (
        <div key={s.label} className="bg-secondary/50 rounded-lg p-4 border border-border">
          <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
          <div className={`font-mono font-semibold text-sm ${s.color || 'text-foreground'}`}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
