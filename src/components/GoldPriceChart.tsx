import { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, CrosshairMode, AreaSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import type { GoldPrice, Currency, WeightUnit } from '@/lib/gold-types';
import type { TimeRange } from '@/hooks/use-gold-price';
import type { MarketFreshness } from '@/hooks/use-gold-price';
import { priceBasisLabel, priceForUnit, formatCurrency } from '@/lib/gold-types';
import { useI18n } from '@/lib/i18n';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  prices: GoldPrice[];
  currentPrice?: number;
  lastUpdated?: Date | null;
  freshness: MarketFreshness;
  onRefresh?: () => void;
  loading: boolean;
  convert: (usd: number, to: Currency) => number;
  displayCurrency: Currency;
  unit: WeightUnit;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

const TIME_RANGES: TimeRange[] = ['7D', '1M', '6M', '1Y', 'ALL'];

export function GoldPriceChart({
  prices,
  currentPrice,
  lastUpdated,
  freshness,
  onRefresh,
  loading,
  convert,
  displayCurrency,
  unit,
  timeRange,
  onTimeRangeChange,
}: Props) {
  const { t, lang } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const displayCurrencyRef = useRef(displayCurrency);
  displayCurrencyRef.current = displayCurrency;

  const displaySpotPrice = currentPrice ? priceForUnit(convert(currentPrice, displayCurrency), unit) : 0;

  const data = useMemo(() => {
    const mapped = prices
      .map(p => {
        const convertedPerGram = convert(p.price, displayCurrency);
        const displayPrice = priceForUnit(convertedPerGram, unit);
        const value = Math.round(displayPrice * 100) / 100;
        return {
          time: Math.floor(p.timestamp / 1000) as UTCTimestamp,
          value,
        };
      })
      .filter(d => d.value != null && isFinite(d.value) && d.value > 0 && d.time > 0)
      .sort((a, b) => a.time - b.time);

    // Deduplicate by timestamp
    const seen = new Set<number>();
    return mapped.filter(d => {
      if (seen.has(d.time)) return false;
      seen.add(d.time);
      return true;
    });
  }, [prices, convert, displayCurrency, unit]);

  // Create chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.6)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(243, 186, 47, 0.3)', width: 1, style: 2 },
        horzLine: { color: 'rgba(243, 186, 47, 0.3)', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        timeVisible: false,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#F3BA2F',
      topColor: 'rgba(243, 186, 47, 0.28)',
      bottomColor: 'rgba(243, 186, 47, 0.01)',
      lineWidth: 2,
      crosshairMarkerBackgroundColor: '#F3BA2F',
      crosshairMarkerBorderColor: '#13161B',
      crosshairMarkerRadius: 4,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => formatCurrency(price, displayCurrencyRef.current),
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.applyOptions({ timeScale: { timeVisible: timeRange === '7D' } });
  }, [timeRange]);

  // Update data
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      seriesRef.current.setData(data);
      seriesRef.current.applyOptions({
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => formatCurrency(price, displayCurrency),
        },
      });
      chartRef.current?.timeScale().fitContent();
    }
  }, [data, displayCurrency]);

  return (
    <section
      aria-label={t.market}
      className="apple-card dashboard-card p-5 sm:p-6 space-y-4 flex flex-col h-full min-h-[440px] max-h-[440px] justify-between lg:min-h-0 lg:max-h-none"
    >
      {/* ── Market Header Bar ───────────────────────────────── */}
      <div className="flex flex-col items-start justify-between gap-3">
        {/* Left: Section Label & Spot Price */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span
              aria-hidden="true"
              className={`w-1.5 h-1.5 rounded-full ${
                freshness === 'live'
                  ? 'bg-[#10B981] animate-pulse'
                  : freshness === 'stale'
                    ? 'bg-amber-400'
                    : 'bg-slate-400'
              }`}
            />
            <span className="text-xs text-muted-foreground font-medium">
              {t.marketCondition}
            </span>
            <span
              aria-label={`${t.marketCondition}: ${freshness === 'live' ? t.marketLive : freshness === 'stale' ? t.marketStale : t.marketUnavailable}`}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                freshness === 'live'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : freshness === 'stale'
                    ? 'bg-amber-500/15 text-amber-200 border-amber-500/30'
                    : 'bg-white/10 text-white/80 border-white/20'
              }`}
            >
              {freshness === 'live' ? t.marketLive : freshness === 'stale' ? t.marketStale : t.marketUnavailable}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
              {displaySpotPrice > 0 ? formatCurrency(displaySpotPrice, displayCurrency) : '—'}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {priceBasisLabel(displayCurrency, unit)}
            </span>
          </div>
        </div>

        {/* Right: Time Range Selector, Refresh, & Timestamp */}
        <div className="flex w-full flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Time range pills */}
            <div className="flex items-center bg-[#0E1115] border border-white/[0.04] rounded-lg p-0.5 gap-0.5">
              {TIME_RANGES.map(r => (
                <button
                  key={r}
                  onClick={() => onTimeRangeChange(r)}
                  aria-pressed={r === timeRange}
                  className={`min-h-11 min-w-10 px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                    r === timeRange
                      ? 'bg-[#F3BA2F] text-black shadow-sm'
                      : 'text-muted-foreground hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Refresh button */}
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={loading}
                aria-busy={loading}
                className="h-10 w-10 text-muted-foreground hover:text-white hover:bg-white/[0.04] rounded-lg"
                title={lang === 'cn' ? '刷新金价' : 'Refresh prices'}
                aria-label={lang === 'cn' ? '刷新金价' : 'Refresh prices'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>

        </div>
      </div>

      {/* ── Chart Viewport (Fix 1: Move inside inner padded bounds, eliminate bottom overflow) ── */}
      <div className="relative flex-1 flex flex-col justify-between min-h-0 pt-1 pb-1 px-1">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#13161B]/80 backdrop-blur-sm rounded-xl">
            <div className="text-muted-foreground text-xs">{t.loading}</div>
          </div>
        )}
        <div ref={containerRef} className="h-[250px] sm:h-[265px] w-full" />
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-2 text-[10px] text-muted-foreground font-mono">
        <span className="shrink-0">{lang === 'cn' ? '本地时间' : 'Local time'}</span>
        <span className="text-right tabular-nums">
          {lastUpdated
            ? `${t.quoteUpdated} ${lastUpdated.toLocaleTimeString(lang === 'cn' ? 'zh-CN' : 'en-US')}`
            : t.quoteNotUpdatedYet}
        </span>
      </div>
    </section>
  );
}
