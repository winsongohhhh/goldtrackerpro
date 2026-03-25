import { useState } from 'react';
import { GoldPriceChart } from '@/components/GoldPriceChart';
import { AddTradeForm } from '@/components/AddTradeForm';
import { TradeList } from '@/components/TradeList';
import { TradeSummary } from '@/components/TradeSummary';
import { useGoldPrice } from '@/hooks/use-gold-price';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { useTrades } from '@/hooks/use-trades';
import { useI18n } from '@/lib/i18n';
import { RefreshCw, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Currency, WeightUnit } from '@/lib/gold-types';
import { formatCurrency, priceForUnit } from '@/lib/gold-types';

const Index = () => {
  const { prices, currentPrice, loading, lastUpdated, refetch } = useGoldPrice();
  const { trades, addTrade, deleteTrade } = useTrades();
  const { convert } = useExchangeRates();
  const { t, lang, setLang } = useI18n();
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
  const [unit, setUnit] = useState<WeightUnit>('g');

  const displayPrice = priceForUnit(convert(currentPrice, displayCurrency), unit);
  const unitLabel = unit === 'oz' ? '/oz' : '/g';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t.appTitle}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t.appSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === 'cn' ? 'en' : 'cn')}
              className="text-muted-foreground hover:text-primary gap-1"
            >
              <Globe className="w-4 h-4" />
              {lang === 'cn' ? 'EN' : '中文'}
            </Button>

            {/* Unit toggle */}
            <Select value={unit} onValueChange={v => setUnit(v as WeightUnit)}>
              <SelectTrigger className="w-16 bg-secondary border-border text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="oz">oz</SelectItem>
              </SelectContent>
            </Select>

            {/* Currency selector */}
            <Select value={displayCurrency} onValueChange={v => setDisplayCurrency(v as Currency)}>
              <SelectTrigger className="w-20 bg-secondary border-border text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CNY">CNY</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="MYR">MYR</SelectItem>
              </SelectContent>
            </Select>

            {currentPrice > 0 && (
              <div className="text-right">
                <div className="font-mono text-lg font-bold text-primary">
                  {formatCurrency(displayPrice, displayCurrency)}
                </div>
                <div className="text-[10px] text-muted-foreground">{displayCurrency}{unitLabel}</div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={refetch}
              className="text-muted-foreground hover:text-primary"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Price Chart */}
        <section className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t.priceChart}
            </h2>
            <span className="text-[10px] text-muted-foreground font-mono">
              {t.updated}: {lastUpdated.toLocaleTimeString('zh-CN')}
            </span>
          </div>
          <GoldPriceChart
            prices={prices}
            loading={loading}
            convert={convert}
            displayCurrency={displayCurrency}
            unit={unit}
          />
        </section>

        {/* Summary */}
        <TradeSummary
          trades={trades}
          currentPrice={currentPrice}
          convert={convert}
          displayCurrency={displayCurrency}
          unit={unit}
        />

        {/* Add Trade */}
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {t.addTrade}
          </h2>
          <AddTradeForm
            onAdd={addTrade}
            currentPrice={currentPrice}
            convert={convert}
            displayCurrency={displayCurrency}
            unit={unit}
          />
        </section>

        {/* Trade List */}
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            {t.tradeList}
          </h2>
          <TradeList
            trades={trades}
            currentPrice={currentPrice}
            onDelete={deleteTrade}
            convert={convert}
            displayCurrency={displayCurrency}
            unit={unit}
          />
        </section>
      </div>
    </div>
  );
};

export default Index;
