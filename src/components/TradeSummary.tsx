import type { GoldTrade } from '@/lib/gold-types';
import { convertToGrams, OZ_TO_GRAM, formatCurrency } from '@/lib/gold-types';

interface Props {
  trades: GoldTrade[];
  currentPrice: number; // USD per oz
}

export function TradeSummary({ trades, currentPrice }: Props) {
  if (trades.length === 0) return null;

  const totalGrams = trades.reduce((sum, t) => sum + convertToGrams(t.quantity, t.unit), 0);
  const totalOz = totalGrams / OZ_TO_GRAM;

  // Total cost in USD (simplified: assume all USD)
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

  const stats = [
    { label: '总持仓', value: `${totalGrams.toFixed(2)}g / ${totalOz.toFixed(4)}oz` },
    { label: '平均成本', value: `${formatCurrency(avgCostPerOz, 'USD')}/oz` },
    { label: '当前市值', value: formatCurrency(currentValue, 'USD') },
    {
      label: '总盈亏',
      value: `${isProfit ? '+' : ''}${formatCurrency(totalPnL, 'USD')} (${isProfit ? '+' : ''}${pnlPercent.toFixed(2)}%)`,
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
