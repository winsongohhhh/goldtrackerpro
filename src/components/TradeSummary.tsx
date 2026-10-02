import type { GoldTrade, Currency, WeightUnit } from '@/lib/gold-types';
import { formatCurrency, priceForUnit, quantityForUnit } from '@/lib/gold-types';
import { useI18n } from '@/lib/i18n';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  trades: GoldTrade[];
  currentPrice: number; // USD per gram
  convert: (usd: number, to: Currency) => number;
  displayCurrency: Currency;
  unit: WeightUnit;
}

function formatQty(value: number): string {
  if (value === 0) return '0';
  const fixed4 = value.toFixed(4);
  const stripped = parseFloat(fixed4).toString();
  if (stripped.includes('e')) return value.toFixed(4);
  return stripped;
}

export function TradeSummary({ trades, currentPrice, convert, displayCurrency, unit }: Props) {
  const { t } = useI18n();

  const unitLabel = unit === 'oz' ? 'oz' : 'g';
  const dc = displayCurrency;

  // ── Empty state ──────────────────────────────────────────
  if (trades.length === 0) {
    return (
      <section className="bg-[#13161B] border border-white/[0.06] rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center h-full flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto mb-3 flex items-center justify-center font-bold text-lg">
          ◆
        </div>
        <p className="text-sm text-muted-foreground">{t.noTradesPortfolio}</p>
      </section>
    );
  }

  // ── Calculations (100% identical to original logic) ──────
  const totalGrams = trades.reduce((sum, tr) => sum + tr.quantity, 0);
  const displayQty = quantityForUnit(totalGrams, unit);

  const totalCostUSD = trades.reduce((sum, trade) => {
    const costInTradeCurrency = trade.price * trade.quantity;
    const rate = convert(1, trade.currency);
    return sum + (rate > 0 ? costInTradeCurrency / rate : 0);
  }, 0);

  const avgCostPerGramUSD = totalGrams > 0 ? totalCostUSD / totalGrams : 0;
  const currentValueUSD = currentPrice * totalGrams;
  const totalPnLUSD = currentValueUSD - totalCostUSD;
  const pnlPercent = totalCostUSD > 0 ? (totalPnLUSD / totalCostUSD) * 100 : 0;
  const isProfit = totalPnLUSD >= 0;

  const totalInvested = convert(totalCostUSD, dc);
  const currentValue = convert(currentValueUSD, dc);
  const totalPnL = convert(totalPnLUSD, dc);
  const avgCostPerUnit = priceForUnit(convert(avgCostPerGramUSD, dc), unit);

  const pnlSign = isProfit ? '+' : '';
  const pnlColor = isProfit ? 'text-[#10B981]' : 'text-[#EF4444]';
  const pillBg = isProfit ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/25' : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/25';
  const dotColor = isProfit ? 'bg-[#10B981]' : 'bg-[#EF4444]';

  return (
    <section
      aria-label={t.portfolio}
      className="bg-[#13161B] border border-white/[0.06] rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-5 h-full flex flex-col justify-between"
    >
      {/* ── Top Header Row ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">
          {t.holdingShare}
        </span>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${pillBg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span>
            {pnlSign}{pnlPercent.toFixed(2)}% {t.yieldRate}
          </span>
        </div>
      </div>

      {/* ── Middle Split: Holdings (Left) & Current Value (Right) ── */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Total Holdings */}
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl sm:text-5xl font-bold tracking-tight text-white tabular-nums">
              {formatQty(displayQty)}
            </span>
            <span className="text-lg sm:text-xl font-medium text-amber-400">
              {unitLabel}
            </span>
          </div>
          <span className="text-xs text-muted-foreground mt-1 block">
            {t.holdingQty}
          </span>
        </div>

        {/* Right: Current Market Value & Unrealized P&L */}
        <div className="text-right">
          <span className="text-[11px] text-muted-foreground block mb-0.5">
            {t.currentMarketValue}
          </span>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums leading-tight">
            {formatCurrency(currentValue, dc)}
          </div>
          <div className={`inline-flex items-center justify-end gap-1 text-xs sm:text-sm font-semibold mt-1 tabular-nums ${pnlColor}`}>
            {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>
              {t.unrealizedPnlShort} {pnlSign}{formatCurrency(totalPnL, dc)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom Inset Sub-stats Row ──────────────────────── */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {/* Total Invested */}
        <div className="bg-[#0E1115] border border-white/[0.04] rounded-xl p-3 min-w-0">
          <span className="text-[10px] text-muted-foreground block truncate mb-1">
            {t.totalInvested}
          </span>
          <div className="text-xs sm:text-sm font-bold text-white tabular-nums truncate">
            {formatCurrency(totalInvested, dc)}
          </div>
        </div>

        {/* Avg Purchase Price */}
        <div className="bg-[#0E1115] border border-white/[0.04] rounded-xl p-3 min-w-0">
          <span className="text-[10px] text-muted-foreground block truncate mb-1">
            {t.averagePurchasePrice}
          </span>
          <div className="text-xs sm:text-sm font-bold text-white tabular-nums truncate">
            {formatCurrency(avgCostPerUnit, dc)}/{unitLabel}
          </div>
        </div>

        {/* Trades Count */}
        <div className="bg-[#0E1115] border border-white/[0.04] rounded-xl p-3 min-w-0">
          <span className="text-[10px] text-muted-foreground block truncate mb-1">
            {t.numTrades}
          </span>
          <div className="text-xs sm:text-sm font-bold text-white tabular-nums truncate">
            {trades.length}
          </div>
        </div>
      </div>
    </section>
  );
}
