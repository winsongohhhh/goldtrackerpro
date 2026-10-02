import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { GoldTrade, Currency, WeightUnit } from '@/lib/gold-types';
import { formatCurrency, priceForUnit, quantityForUnit } from '@/lib/gold-types';
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
  const unitLabel = unit === 'oz' ? 'oz' : 'g';

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
    return `${formatCurrency(perUnit, displayCurrency)}/${unitLabel}`;
  };

  const getCurrentVal = (trade: GoldTrade): string => {
    const currentInDisplay = convert(currentPrice, displayCurrency);
    const val = currentInDisplay * trade.quantity;
    return formatCurrency(val, displayCurrency);
  };

  return (
    <section className="bg-[#13161B] border border-white/[0.06] rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-3">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white">
            {t.transactionRecords}
          </h2>
          {trades.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-muted-foreground tabular-nums">
              {trades.length}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground/70 select-none">
          {t.viewAll}
        </span>
      </div>

      {/* ── Empty State ────────────────────────────────────── */}
      {trades.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">
          {t.noTrades}
        </p>
      ) : (
        /* ── Transactions List ──────────────────────────────── */
        <ul className="divide-y divide-white/[0.04]">
          {trades.map((trade) => {
            const pnl = getPnL(trade);
            const isProfit = pnl >= 0;
            const displayQty = quantityForUnit(trade.quantity, unit);
            const pnlColor = isProfit ? 'text-[#10B981]' : 'text-[#EF4444]';

            return (
              <li key={trade.id} className="py-3.5 flex items-center justify-between gap-3 group">
                {/* Left Column: Price + Quantity Pill & Date */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white tabular-nums">
                      {getDisplayPrice(trade)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[10px] font-bold tabular-nums">
                      {formatQty(displayQty)} {unitLabel}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground/80 font-mono mt-0.5 block">
                    {trade.date}
                  </span>
                </div>

                {/* Right Column: P&L + Value / Cost & Delete */}
                <div className="flex items-center gap-2.5 text-right flex-shrink-0">
                  <div>
                    <div className={`flex items-center justify-end gap-1 text-xs sm:text-sm font-bold tabular-nums ${pnlColor}`}>
                      {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>
                        {isProfit ? '+' : ''}{formatCurrency(pnl, displayCurrency)}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block tabular-nums mt-0.5">
                      {t.presentValue} {getCurrentVal(trade)}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => onDelete(trade.id)}
                    aria-label={t.pnl + ' delete'}
                    className="text-muted-foreground/30 hover:text-[#EF4444] p-1 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
