import type { GoldTrade, Currency, WeightUnit } from '@/lib/gold-types';
import { formatCurrency, priceBasisLabel, priceForUnit, quantityForUnit, weightUnitLabel } from '@/lib/gold-types';
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

  const unitLabel = weightUnitLabel(unit);
  const dc = displayCurrency;

  // ── Empty state ──────────────────────────────────────────
  if (trades.length === 0) {
    return (
      <section className="dashboard-card bg-[#13161B] border border-white/[0.06] rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center h-full flex flex-col items-center justify-center">
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
      className="apple-card dashboard-card p-4 sm:p-5 flex flex-col gap-3.5 h-full"
    >
      {/* ── Top Header Row ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider text-left">
          {t.portfolio}
        </span>
        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${pillBg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span>
            {pnlSign}{pnlPercent.toFixed(2)}% {t.yieldRate}
          </span>
        </div>
      </div>

      {/* ── Hero Metric: Net Worth & Secondary Return (Fix 4: Tight & Dense) ── */}
      <div className="flex flex-col items-start gap-0.5 text-left">
        <span className="text-[10px] text-muted-foreground font-medium block">
          {t.currentMarketValue}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white tabular-nums leading-none">
            {formatCurrency(currentValue, dc)}
          </span>
        </div>
        <div className={`inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums mt-0.5 ${pnlColor}`}>
          {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>
            {t.unrealizedPnlShort} {pnlSign}{formatCurrency(totalPnL, dc)}
          </span>
        </div>
      </div>

      {/* ── Bottom Inset Sub-stats (Fix 4: Compact 3-Column Grid) ──────── */}
      <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/[0.06]">
        {/* Total Holdings */}
        <div className="bg-[#E5A93C]/[0.08] border border-[#E5A93C]/25 rounded-xl p-2.5 sm:p-3 min-w-0 flex flex-col justify-between">
          <span className="text-[10px] text-[#E5A93C]/90 font-semibold block truncate mb-1 text-left">
            {t.holdingQty}
          </span>
          <div className="text-base sm:text-lg font-extrabold text-white tabular-nums whitespace-normal break-all [overflow-wrap:anywhere] text-left leading-tight">
            {formatQty(displayQty)} <span className="text-[#E5A93C] font-semibold text-xs sm:text-sm">{unitLabel}</span>
          </div>
        </div>

        {/* Total Invested */}
        <div className="bg-black/25 border border-white/[0.04] rounded-xl p-2.5 sm:p-3 min-w-0 flex flex-col justify-between">
          <span className="text-[10px] text-muted-foreground block truncate mb-1 text-left">
            {t.totalInvested}
          </span>
          <div className="text-xs sm:text-sm font-bold text-white tabular-nums truncate text-left">
            {formatCurrency(totalInvested, dc)}
          </div>
        </div>

        {/* Avg Purchase Price */}
        <div className="bg-black/25 border border-white/[0.04] rounded-xl p-2.5 sm:p-3 min-w-0 flex flex-col justify-between">
          <span className="text-[10px] text-muted-foreground block truncate mb-1 text-left">
            {t.averagePurchasePrice} ({priceBasisLabel(dc, unit)})
          </span>
          <div className="text-xs sm:text-sm font-bold text-white tabular-nums truncate text-left">
            {formatCurrency(avgCostPerUnit, dc)}/{unitLabel}
          </div>
        </div>
      </div>
    </section>
  );
}
