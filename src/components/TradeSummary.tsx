import type { GoldTrade, Currency, WeightUnit } from '@/lib/gold-types';
import { formatCurrency, priceBasisLabel, priceForUnit, quantityForUnit, weightUnitLabel } from '@/lib/gold-types';
import { useI18n } from '@/lib/i18n';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ExchangeRateFreshness } from '@/hooks/use-exchange-rates';

interface Props {
  trades: GoldTrade[];
  currentPrice: number; // USD per gram
  convert: (usd: number, to: Currency) => number;
  displayCurrency: Currency;
  unit: WeightUnit;
  fxFreshness: ExchangeRateFreshness;
  fxLastUpdated: Date | null;
}

function FxRateStatus({ freshness, lastUpdated }: { freshness: ExchangeRateFreshness; lastUpdated: Date | null }) {
  const { t, lang } = useI18n();
  const formattedTime = lastUpdated
    ? new Intl.DateTimeFormat(lang === 'cn' ? 'zh-CN' : 'en-MY', { hour: 'numeric', minute: '2-digit' }).format(lastUpdated)
    : null;

  return (
    <div className="flex min-w-0 items-center gap-2 text-[10px]" aria-label={freshness === 'live' ? t.fxRatesLive : t.fxRatesStale}>
      <span className={`shrink-0 rounded-full border px-2 py-0.5 font-semibold ${freshness === 'live' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
        {freshness === 'live' ? t.fxRatesLive : t.fxRatesStale}
      </span>
      <span className="truncate text-muted-foreground">
        {formattedTime ? `${t.fxRatesLastSuccessfulUpdate} ${formattedTime}` : t.fxRatesFallback}
      </span>
    </div>
  );
}

function formatQty(value: number): string {
  if (value === 0) return '0';
  const fixed4 = value.toFixed(4);
  const stripped = parseFloat(fixed4).toString();
  if (stripped.includes('e')) return value.toFixed(4);
  return stripped;
}

export function TradeSummary({ trades, currentPrice, convert, displayCurrency, unit, fxFreshness, fxLastUpdated }: Props) {
  const { t } = useI18n();

  const unitLabel = weightUnitLabel(unit);
  const dc = displayCurrency;

  // ── Empty state ──────────────────────────────────────────
  if (trades.length === 0) {
    return (
      <section className="dashboard-card bg-[#13161B] border border-white/[0.06] rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-4 text-center h-full flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto mb-3 flex items-center justify-center font-bold text-lg">
          ◆
        </div>
        <p className="text-sm text-muted-foreground">{t.noTradesPortfolio}</p>
        <div className="mt-3"><FxRateStatus freshness={fxFreshness} lastUpdated={fxLastUpdated} /></div>
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
  const returnPanelClass = isProfit
    ? 'bg-[#10B981]/[0.08] border-[#10B981]/20'
    : 'bg-[#EF4444]/[0.08] border-[#EF4444]/20';

  return (
    <section
      aria-label={t.portfolio}
      className="apple-card dashboard-card grid h-full grid-rows-[auto_minmax(0,1fr)_auto] gap-3 p-4 sm:p-5 lg:p-4"
    >
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <span className="dashboard-card-title inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-[#E5A93C]" aria-hidden="true" />
          {t.portfolio}
        </span>
        <FxRateStatus freshness={fxFreshness} lastUpdated={fxLastUpdated} />
      </div>

      <div className="portfolio-hero grid min-h-0 grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-stretch gap-2.5 text-left sm:gap-4">
        <div className="flex min-w-0 flex-col justify-center">
          <span className="text-[10px] font-medium text-muted-foreground">
            {t.currentMarketValue}
          </span>
          <span className="mt-1 text-[clamp(1.65rem,3.15vw,2.5rem)] font-extrabold leading-none tracking-tight text-white tabular-nums">
            {formatCurrency(currentValue, dc)}
          </span>
        </div>

        <div className={`portfolio-return-panel flex min-w-0 flex-col justify-center rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3 ${returnPanelClass}`}>
          <span className="text-[10px] font-semibold leading-tight tracking-wide text-muted-foreground">
            {t.unrealizedPnlShort}
          </span>
          <span className={`mt-1 text-[clamp(1rem,1.65vw,1.5rem)] font-bold leading-tight tracking-tight tabular-nums ${pnlColor}`}>
            {pnlSign}{formatCurrency(totalPnL, dc)}
          </span>
          <span className={`mt-1 inline-flex items-center gap-1.5 text-[10px] font-semibold tabular-nums sm:text-xs ${pnlColor}`}>
            {isProfit ? <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            <span>{pnlSign}{pnlPercent.toFixed(2)}% {t.yieldRate}</span>
          </span>
        </div>
      </div>

      {/* ── Bottom Inset Sub-stats (Fix 4: Compact 3-Column Grid) ──────── */}
      <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/[0.06] lg:-translate-y-1">
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
