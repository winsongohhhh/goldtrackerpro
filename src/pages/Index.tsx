import { useState } from 'react';
import { GoldPriceChart } from '@/components/GoldPriceChart';
import { AddTradeForm } from '@/components/AddTradeForm';
import { TradeList } from '@/components/TradeList';
import { TradeSummary } from '@/components/TradeSummary';
import { useGoldPrice } from '@/hooks/use-gold-price';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { useTrades } from '@/hooks/use-trades';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/use-auth';
import { RefreshCw, Globe, LogOut } from 'lucide-react';
import { GoldAdvisorChat } from '@/components/GoldAdvisorChat';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Currency, WeightUnit } from '@/lib/gold-types';
import { formatCurrency, priceForUnit } from '@/lib/gold-types';

const Index = () => {
  const { prices, currentPrice, loading, lastUpdated, refetch, timeRange, setTimeRange } = useGoldPrice();
  const { trades, addTrade, deleteTrade } = useTrades();
  const { convert } = useExchangeRates();
  const { t, lang, setLang } = useI18n();
  const { signOut } = useAuth();
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
  const [unit, setUnit] = useState<WeightUnit>('oz');

  const displayPrice = priceForUnit(convert(currentPrice, displayCurrency), unit);
  const unitLabel = unit === 'oz' ? '/oz' : '/g';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Gold Tracker Pro
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t.appSubtitle}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === 'cn' ? 'en' : 'cn')}
              className="text-muted-foreground hover:text-foreground gap-1 text-xs"
            >
              <Globe className="w-3.5 h-3.5" />
              {lang === 'cn' ? 'EN' : '中文'}
            </Button>

            <Select value={unit} onValueChange={v => setUnit(v as WeightUnit)}>
              <SelectTrigger className="w-16 bg-secondary border-border text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="oz">oz</SelectItem>
              </SelectContent>
            </Select>

            <Select value={displayCurrency} onValueChange={v => setDisplayCurrency(v as Currency)}>
              <SelectTrigger className="w-20 bg-secondary border-border text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CNY">CNY</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="MYR">MYR</SelectItem>
                <SelectItem value="SGD">SGD</SelectItem>
              </SelectContent>
            </Select>

            {currentPrice > 0 && (
              <div className="text-right">
                <div className="font-mono text-lg font-semibold text-primary tabular-nums">
                  {formatCurrency(displayPrice, displayCurrency)}
                </div>
                <div className="text-[10px] text-muted-foreground">{displayCurrency}{unitLabel}</div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={refetch}
              className="text-muted-foreground hover:text-foreground h-8 w-8"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground h-8 w-8"
              title={lang === 'cn' ? '退出登录' : 'Sign Out'}
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Price Chart */}
        <section className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              {t.priceChart}
            </h2>
            <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
              {t.updated}: {lastUpdated.toLocaleTimeString('zh-CN')}
            </span>
          </div>
          <GoldPriceChart
            prices={prices}
            loading={loading}
            convert={convert}
            displayCurrency={displayCurrency}
            unit={unit}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
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
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
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
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
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
      <GoldAdvisorChat currentPrice={currentPrice} />
    </div>
  );
};

export default Index;
