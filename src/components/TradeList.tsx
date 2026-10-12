import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { GoldTrade, Currency, WeightUnit } from '@/lib/gold-types';
import { formatCurrency, priceBasisLabel, priceForUnit, quantityForUnit, weightUnitLabel } from '@/lib/gold-types';
import { useI18n } from '@/lib/i18n';

interface Props {
  trades: GoldTrade[];
  currentPrice: number; // USD per gram
  onDelete: (id: string) => Promise<{ success: boolean }>;
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

export function TradeList({ trades, currentPrice, onDelete, convert, displayCurrency, unit }: Props) {
  const { t } = useI18n();
  const unitLabel = weightUnitLabel(unit);

  const getPnL = (trade: GoldTrade): number => {
    const currentInDisplay = convert(currentPrice, displayCurrency);
    const rateToTrade = convert(1, trade.currency);
    const tradePriceUSD = rateToTrade > 0 ? trade.price / rateToTrade : 0;
    const tradePriceInDisplay = convert(tradePriceUSD, displayCurrency);
    const pnlPerGram = currentInDisplay - tradePriceInDisplay;
    return pnlPerGram * trade.quantity;
  };

  const getDisplayPrice = (trade: GoldTrade): string => {
    const rateToTrade = convert(1, trade.currency);
    const tradePriceUSD = rateToTrade > 0 ? trade.price / rateToTrade : 0;
    const inDisplay = convert(tradePriceUSD, displayCurrency);
    const perUnit = priceForUnit(inDisplay, unit);
    return `${formatCurrency(perUnit, displayCurrency)} ${priceBasisLabel(displayCurrency, unit)}`;
  };

  const getCurrentVal = (trade: GoldTrade): string => {
    const currentInDisplay = convert(currentPrice, displayCurrency);
    const val = currentInDisplay * trade.quantity;
    return formatCurrency(val, displayCurrency);
  };

  return (
    <section className="trade-list-card apple-card dashboard-card p-5 sm:p-6 flex flex-col h-full min-h-[440px] max-h-[440px] justify-between lg:min-h-0 lg:max-h-none">
      {/* ── Header without 'View All' Button (Fix 5) ───────────── */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.transactionRecords}
          </h2>
          {trades.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-muted-foreground tabular-nums">
              {trades.length}
            </span>
          )}
        </div>
      </div>

      {/* ── Scrollable Transaction List with Sleek iOS Scrollbar (Fix 3: pb-6 & max-h constraint) ─ */}
      <div className="transactions-container flex-1 overflow-y-auto overscroll-contain pr-1.5 pt-1 pb-6 max-h-[360px]">
        {trades.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
            {t.noTrades}
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.02]">
            {trades.map((trade) => {
              const pnl = getPnL(trade);
              const isProfit = pnl >= 0;
              const displayQty = quantityForUnit(trade.quantity, unit);
              const pnlColor = isProfit ? 'text-[#10B981]' : 'text-[#EF4444]';

              return (
                <li key={trade.id} className="py-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2 group border-b border-white/[0.04] last:border-none">
                  {/* Left: Price, Quantity Pill, Date */}
                  <div className="min-w-0 flex-1 basis-[12rem]">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="min-w-0 max-w-full break-all text-xs sm:text-sm font-bold text-white tabular-nums">
                        {getDisplayPrice(trade)}
                      </span>
                      <span className="max-w-full whitespace-normal break-all [overflow-wrap:anywhere] px-1.5 py-0.5 rounded bg-[#E5A93C]/15 text-[#E5A93C] border border-[#E5A93C]/25 text-[10px] font-bold tabular-nums">
                        {formatQty(displayQty)} {unitLabel}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono mt-0.5 block">
                      {trade.date}
                    </span>
                  </div>

                  {/* Right: PnL, Valuation, Delete Action */}
                  <div className="flex min-w-0 max-w-full flex-shrink items-start gap-2.5 text-right">
                    <div className="min-w-0 max-w-full">
                      <div className={`flex items-center justify-end gap-1 text-xs sm:text-sm font-bold tabular-nums ${pnlColor}`}>
                        {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span className="break-all [overflow-wrap:anywhere]">
                          {isProfit ? '+' : ''}{formatCurrency(pnl, displayCurrency)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block tabular-nums mt-0.5">
                        {t.presentValue} {getCurrentVal(trade)}
                      </span>
                    </div>

                    <button
                      onClick={() => onDelete(trade.id)}
                          aria-label={`${t.deleteTrade}: ${formatQty(displayQty)} ${unitLabel}`}
                      className="text-muted-foreground hover:text-[#EF4444] p-1.5 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-white/[0.06]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
