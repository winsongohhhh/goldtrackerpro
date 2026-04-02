import { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, CrosshairMode, AreaSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import type { GoldPrice, Currency, WeightUnit } from '@/lib/gold-types';
import type { TimeRange } from '@/hooks/use-gold-price';
import { priceForUnit, formatCurrency } from '@/lib/gold-types';
import { useI18n } from '@/lib/i18n';

interface Props {
  prices: GoldPrice[];
  loading: boolean;
  convert: (usd: number, to: Currency) => number;
  displayCurrency: Currency;
  unit: WeightUnit;
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

const TIME_RANGES: TimeRange[] = ['7D', '1M', '6M', '1Y', 'ALL'];

export function GoldPriceChart({ prices, loading, convert, displayCurrency, unit, timeRange, onTimeRangeChange }: Props) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);

  const data = useMemo(() => {
    const mapped = prices
      .map(p => {
        const convertedPerGram = convert(p.price, displayCurrency);
        const displayPrice = priceForUnit(convertedPerGram, unit);
        const value = Math.round(displayPrice * 100) / 100;
        return {
          time: (Math.floor(p.timestamp / 1000)) as any,
          value,
        };
      })
      .filter(d => d.value != null && isFinite(d.value) && d.value > 0 && d.time > 0)
      .sort((a, b) => a.time - b.time);

    // Deduplicate by timestamp — lightweight-charts crashes on duplicates
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
        textColor: 'hsl(220, 10%, 50%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'hsla(220, 15%, 18%, 0.5)' },
        horzLines: { color: 'hsla(220, 15%, 18%, 0.5)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'hsla(43, 80%, 55%, 0.3)', width: 1, style: 2 },
        horzLine: { color: 'hsla(43, 80%, 55%, 0.3)', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'hsla(220, 15%, 18%, 0.5)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: 'hsla(220, 15%, 18%, 0.5)',
        timeVisible: timeRange === '7D',
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: 'hsl(43, 80%, 55%)',
      topColor: 'hsla(43, 80%, 55%, 0.3)',
      bottomColor: 'hsla(43, 80%, 55%, 0.02)',
      lineWidth: 2,
      crosshairMarkerBackgroundColor: 'hsl(43, 80%, 55%)',
      crosshairMarkerBorderColor: 'hsl(220, 20%, 7%)',
      crosshairMarkerRadius: 4,
      priceFormat: {
        type: 'custom',
        formatter: (price: any) => formatCurrency(price, displayCurrency),
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
  }, [timeRange]);

  // Update data
  useEffect(() => {
    if (seriesRef.current && data.length > 0) {
      seriesRef.current.setData(data);
      // Update price format when currency changes
      seriesRef.current.applyOptions({
        priceFormat: {
          type: 'custom',
          formatter: (price: any) => formatCurrency(price, displayCurrency),
        },
      });
      chartRef.current?.timeScale().fitContent();
    }
  }, [data, displayCurrency]);

  return (
    <div className="space-y-3">
      {/* Time range selector */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TIME_RANGES.map(r => (
          <button
            key={r}
            onClick={() => onTimeRangeChange(r)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap
              ${r === timeRange
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-card/80 backdrop-blur-sm rounded-lg">
            <div className="text-muted-foreground text-sm">{t.loading}</div>
          </div>
        )}
        <div ref={containerRef} className="h-[400px] w-full" />
        <div className="text-[10px] text-muted-foreground text-right mt-1 font-mono">NY Time (ET)</div>
      </div>
    </div>
  );
}
