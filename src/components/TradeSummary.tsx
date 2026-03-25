import type { GoldTrade, Currency } from '@/lib/gold-types';
import { formatCurrency } from '@/lib/gold-types';
import { useI18n } from '@/lib/i18n';

interface Props {
  trades: GoldTrade[];
  currentPrice: number; // USD per gram
  convert: (usd: number, to: Currency) => number;
  displayCurrency: Currency;
}

export function TradeSummary({ trades, currentPrice, convert, displayCurrency }: Props) {
  const { t } = useI18n();
  if (trades.length === 0) return null;

  const totalGrams = trades.reduce((sum, t) => sum + t.quantity, 0);

  // Total cost in USD: convert each trade's cost from its currency to USD
  const totalCostUSD = trades.reduce((sum, trade) => {
    const costInTradeCurrency = trade.price * trade.quantity;
    const rate = convert(1, trade.currency); // 1 USD = X tradeCurrency
    return sum + (rate > 0 ? costInTradeCurrency / rate : 0);
  }, 0);

  const avgCostPerGramUSD = totalCostUSD / totalGrams;
  const currentValueUSD = currentPrice * totalGrams;
  const totalPnLUSD = currentValueUSD - totalCostUSD;
  const pnlPercent = totalCostUSD > 0 ? (totalPnLUSD / totalCostUSD) * 100 : 0;
  const isProfit = totalPnLUSD >= 0;

  const dc = displayCurrency;

  const stats = [
    { label: t.totalHolding, value: `${totalGrams.toFixed(2)}g` },
    { label: t.avgCost, value: `${formatCurrency(convert(avgCostPerGramUSD, dc), dc)}/g` },
    { label: t.marketValue, value: formatCurrency(convert(currentValueUSD, dc), dc) },
    {
      label: t.totalPnL,
      value: `${isProfit ? '+' : ''}${formatCurrency(convert(totalPnLUSD, dc), dc)} (${isProfit ? '+' : ''}${pnlPercent.toFixed(2)}%)`,
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
