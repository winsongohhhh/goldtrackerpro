import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { GoldTrade, Currency, WeightUnit } from '@/lib/gold-types';
import { formatCurrency, priceBasisLabel, priceForUnit, quantityForUnit, weightUnitLabel } from '@/lib/gold-types';
import { useI18n, type Language } from '@/lib/i18n';

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

function formatTradeDate(value: string, language: Language): { compact: string; accessible: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) return { compact: value, accessible: value };
  if (match && (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3]))) {
    return { compact: value, accessible: value };
  }

  const locale = language === 'cn' ? 'zh-CN' : 'en-GB';
  return {
    compact: new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: language === 'cn' ? 'numeric' : 'short',
      year: 'numeric',
    }).format(date),
    accessible: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date),
  };
}

function compactCurrency(value: number, currency: Currency): string {
  if (!Number.isFinite(value) || Math.abs(value) < 10_000) {
    return formatCurrency(value, currency);
  }

  const locale = currency === 'MYR'
    ? 'en-MY'
    : currency === 'CNY'
      ? 'zh-CN'
      : currency === 'SGD'
        ? 'en-SG'
        : 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumSignificantDigits: 4,
  }).format(value);
}

function compactQuantity(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) < 1_000) return formatQty(value);
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumSignificantDigits: 4,
  }).format(value);
}

export function TradeList({ trades, currentPrice, onDelete, convert, displayCurrency, unit }: Props) {
  const { t, lang } = useI18n();
  const unitLabel = weightUnitLabel(unit);

  const getPnL = (trade: GoldTrade): number => {
    const currentInDisplay = convert(currentPrice, displayCurrency);
    const rateToTrade = convert(1, trade.currency);
    const tradePriceUSD = rateToTrade > 0 ? trade.price / rateToTrade : 0;
    const tradePriceInDisplay = convert(tradePriceUSD, displayCurrency);
    const pnlPerGram = currentInDisplay - tradePriceInDisplay;
    return pnlPerGram * trade.quantity;
  };

  const getDisplayPrice = (trade: GoldTrade): { compact: string; full: string } => {
    const rateToTrade = convert(1, trade.currency);
    const tradePriceUSD = rateToTrade > 0 ? trade.price / rateToTrade : 0;
    const inDisplay = convert(tradePriceUSD, displayCurrency);
    const perUnit = priceForUnit(inDisplay, unit);
    return {
      compact: `${compactCurrency(perUnit, displayCurrency)}/${unit}`,
      full: `${formatCurrency(perUnit, displayCurrency)} ${priceBasisLabel(displayCurrency, unit)}`,
    };
  };

  const getCurrentVal = (trade: GoldTrade): number => {
    const currentInDisplay = convert(currentPrice, displayCurrency);
    return currentInDisplay * trade.quantity;
  };

  return (
    <section className="trade-list-card apple-card dashboard-card p-4 sm:p-5 lg:p-4 flex flex-col h-full min-h-[440px] max-h-[440px] justify-start gap-0 lg:min-h-0 lg:max-h-none">
      <div className="flex items-center justify-between pb-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 id="transaction-history-heading" className="dashboard-card-title text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.transactionRecords}
          </h2>
          {trades.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-muted-foreground tabular-nums">
              {trades.length}
            </span>
          )}
        </div>
      </div>

      <div
        className="transactions-container flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1.5 pt-0 border-y border-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#E5A93C]/60 lg:flex lg:flex-col"
        role="region"
        aria-labelledby="transaction-history-heading"
        tabIndex={trades.length > 0 ? 0 : undefined}
      >
        {trades.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
            {t.noTrades}
          </div>
        ) : (
          <ul className="list-none lg:shrink-0">
            {trades.map((trade) => {
              const pnl = getPnL(trade);
              const isProfit = pnl >= 0;
              const displayQty = quantityForUnit(trade.quantity, unit);
              const fullQuantity = `${formatQty(displayQty)} ${unitLabel}`;
              const shortQuantity = `${compactQuantity(displayQty)} ${unitLabel}`;
              const price = getDisplayPrice(trade);
              const currentValue = getCurrentVal(trade);
              const pnlColor = isProfit ? 'text-[#10B981]' : 'text-[#EF4444]';
              const fullPnl = `${isProfit ? '+' : ''}${formatCurrency(pnl, displayCurrency)}`;
              const compactPnl = `${isProfit ? '+' : ''}${compactCurrency(pnl, displayCurrency)}`;
              const fullCurrentValue = formatCurrency(currentValue, displayCurrency);
              const date = formatTradeDate(trade.date, lang);

              return (
                <li
                  key={trade.id}
                  className="transaction-row group flex min-h-[44px] min-w-0 flex-nowrap items-center justify-between gap-1 py-1.5 first:pt-1.5 snap-start border-b border-white/[0.04] last:border-none"
                >
                  <div className="transaction-primary flex min-w-0 flex-1 flex-nowrap items-center gap-1.5">
                    <span
                      className="transaction-price shrink-0 whitespace-nowrap text-[10px] sm:text-xs font-bold text-white tabular-nums"
                      aria-label={price.full}
                      title={price.full}
                    >
                      {price.compact}
                    </span>
                    <span
                      className="transaction-quantity shrink-0 whitespace-nowrap rounded bg-[#E5A93C]/15 px-1 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#E5A93C] border border-[#E5A93C]/25 tabular-nums"
                      aria-label={fullQuantity}
                      title={fullQuantity}
                    >
                      {shortQuantity}
                    </span>
                    <time
                      className="transaction-date shrink-0 whitespace-nowrap text-[9px] sm:text-[10px] text-muted-foreground font-mono"
                      dateTime={trade.date}
                      aria-label={date.accessible}
                    >
                      {date.compact}
                    </time>
                  </div>

                  <div className="transaction-result flex shrink-0 flex-nowrap items-center gap-1 text-right">
                    <span
                      className={`transaction-pnl whitespace-nowrap text-[10px] sm:text-xs font-bold tabular-nums ${pnlColor}`}
                      aria-label={fullPnl}
                      title={fullPnl}
                    >
                      <span aria-hidden="true" className="inline-flex items-center gap-0.5">
                        {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {compactPnl}
                      </span>
                    </span>
                    <span
                      className="sr-only"
                    >
                      {t.presentValue}: {fullCurrentValue}
                    </span>
                    <span
                      className="transaction-current-value whitespace-nowrap text-[9px] text-muted-foreground tabular-nums"
                      aria-hidden="true"
                      title={`${t.presentValue}: ${fullCurrentValue}`}
                    >
                      ≈{compactCurrency(currentValue, displayCurrency)}
                    </span>
                    <button
                      onClick={() => onDelete(trade.id)}
                      aria-label={`${t.deleteTrade}: ${fullQuantity}`}
                      className="transaction-delete flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-[#EF4444] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-white/[0.06]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
