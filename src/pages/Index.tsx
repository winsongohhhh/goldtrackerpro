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
import { Globe, LogOut } from 'lucide-react';
import { GoldAdvisorChat } from '@/components/GoldAdvisorChat';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Currency, WeightUnit } from '@/lib/gold-types';
import { GoldBarIcon } from '@/components/GoldBarIcon';

const Index = () => {
  const { prices, currentPrice, loading, lastUpdated, refetch, timeRange, setTimeRange } = useGoldPrice();
  const { trades, addTrade, deleteTrade } = useTrades();
  const { convert } = useExchangeRates();
  const { t, lang, setLang } = useI18n();
  const { signOut } = useAuth();
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
  const [unit, setUnit] = useState<WeightUnit>('g');

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">

        {/* ══════════════════════════════════════════════════
            STITCH TOP HEADER
        ══════════════════════════════════════════════════ */}
        <header className="flex items-center justify-between py-2 border-b border-white/[0.04] pb-4">
          {/* Left: Brand Icon + Title + Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm flex-shrink-0">
              <GoldBarIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white leading-none">
                  Gold Tracker <span className="text-amber-400">Pro</span>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 hidden sm:block leading-none">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Right: Controls (Language, Unit Toggle, Currency, Sign Out) */}
          <div className="flex items-center gap-2">
            {/* Language */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLang(lang === 'cn' ? 'en' : 'cn')}
              className="text-muted-foreground hover:text-white h-8 gap-1 text-xs px-2.5 rounded-full bg-[#13161B] border border-white/[0.06]"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'cn' ? 'EN' : '中文'}</span>
            </Button>

            {/* Unit Segmented Control (Stitch design has active in solid gold) */}
            <div
              className="flex items-center bg-[#13161B] border border-white/[0.06] rounded-full p-0.5"
              role="group"
              aria-label={t.unit}
            >
              <button
                onClick={() => setUnit('oz')}
                aria-pressed={unit === 'oz'}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  unit === 'oz'
                    ? 'bg-[#F3BA2F] text-black shadow-sm'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                oz
              </button>
              <button
                onClick={() => setUnit('g')}
                aria-pressed={unit === 'g'}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  unit === 'g'
                    ? 'bg-[#F3BA2F] text-black shadow-sm'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                g
              </button>
            </div>

            {/* Currency Select */}
            <Select value={displayCurrency} onValueChange={v => setDisplayCurrency(v as Currency)}>
              <SelectTrigger className="w-[78px] bg-[#13161B] border border-white/[0.06] text-xs text-white h-8 px-2.5 rounded-full focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">$ USD</SelectItem>
                <SelectItem value="CNY">¥ CNY</SelectItem>
                <SelectItem value="EUR">€ EUR</SelectItem>
                <SelectItem value="MYR">RM MYR</SelectItem>
                <SelectItem value="SGD">S$ SGD</SelectItem>
              </SelectContent>
            </Select>

            {/* Sign Out */}
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-muted-foreground hover:text-white h-8 w-8 rounded-full bg-[#13161B] border border-white/[0.06]"
              title={lang === 'cn' ? '退出登录' : 'Sign Out'}
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════
            STITCH BENTO GRID LAYOUT
            Desktop: 2 Columns (7 cols left, 5 cols right)
            Mobile: 1 Column stack
        ══════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Portfolio Overview & Gold Market Chart */}
          <div className="lg:col-span-7 space-y-5">
            <TradeSummary
              trades={trades}
              currentPrice={currentPrice}
              convert={convert}
              displayCurrency={displayCurrency}
              unit={unit}
            />

            <GoldPriceChart
              prices={prices}
              currentPrice={currentPrice}
              lastUpdated={lastUpdated}
              onRefresh={refetch}
              loading={loading}
              convert={convert}
              displayCurrency={displayCurrency}
              unit={unit}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </div>

          {/* Right Column: Add Trade & Recent Transactions */}
          <div className="lg:col-span-5 space-y-5">
            <AddTradeForm
              onAdd={addTrade}
              currentPrice={currentPrice}
              convert={convert}
              displayCurrency={displayCurrency}
              unit={unit}
            />

            <TradeList
              trades={trades}
              currentPrice={currentPrice}
              onDelete={deleteTrade}
              convert={convert}
              displayCurrency={displayCurrency}
              unit={unit}
            />
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════
          GOLD ADVISOR LAUNCHER & CHAT
      ══════════════════════════════════════════════════ */}
      <GoldAdvisorChat currentPrice={currentPrice} />
    </div>
  );
};

export default Index;
