import { useState, useEffect, useRef } from 'react';
import { GoldPriceChart } from '@/components/GoldPriceChart';
import { TradeList } from '@/components/TradeList';
import { TradeSummary } from '@/components/TradeSummary';
import { useGoldPrice } from '@/hooks/use-gold-price';
import { useExchangeRates } from '@/hooks/use-exchange-rates';
import { useTrades } from '@/hooks/use-trades';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/hooks/use-auth';
import { Globe, LogOut, Settings, Sparkles } from 'lucide-react';
import { GoldAdvisorChat } from '@/components/GoldAdvisorChat';
import { AIProviderSettings } from '@/components/AIProviderSettings';
import { AddTradeForm } from '@/components/AddTradeForm';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { Currency, WeightUnit } from '@/lib/gold-types';
import { weightUnitOptionLabel } from '@/lib/gold-types';
import { GoldAppIcon } from '@/components/GoldAppIcon';

const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'MYR', label: 'MYR (RM)' },
  { value: 'CNY', label: 'CNY (¥)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'SGD', label: 'SGD (S$)' },
];

const Index = () => {
  const { prices, currentPrice, loading, lastUpdated, freshness, refetch, timeRange, setTimeRange } = useGoldPrice();
  const { trades, addTrade, deleteTrade } = useTrades();
  const { convert, freshness: fxFreshness, lastUpdated: fxLastUpdated } = useExchangeRates();
  const { t, lang, setLang } = useI18n();
  const { signOut } = useAuth();
  const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
  const [unit, setUnit] = useState<WeightUnit>('g');

  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providerSettingsOpen, setProviderSettingsOpen] = useState(false);

  const [scrollY, setScrollY] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      setScrollY(el.scrollTop);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const inlineTitleOpacity = Math.min(1, Math.max(0, (scrollY - 20) / 35));

  const LangToggle = () => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === 'cn' ? 'en' : 'cn')}
      className="text-muted-foreground hover:text-white h-11 gap-1 text-xs px-3 rounded-full bg-white/[0.06] border border-white/[0.08]"
    >
      <Globe className="w-3.5 h-3.5" />
      <span>{lang === 'cn' ? 'EN' : '中文'}</span>
    </Button>
  );

  const UnitToggle = ({ settings = false }: { settings?: boolean }) => (
    <div
      className={`flex items-center ${settings ? 'w-[160px] max-w-full' : ''} bg-white/[0.06] border border-white/[0.08] rounded-full p-0.5`}
      role="group"
      aria-label={t.unit}
    >
      {(['oz', 'g'] as WeightUnit[]).map((u) => (
        <button
          key={u}
          onClick={() => setUnit(u)}
          aria-pressed={unit === u}
          className={`min-h-10 ${settings ? 'min-w-0 flex-1 px-1.5 text-[10px]' : 'px-2.5 text-[11px]'} py-1 rounded-full font-semibold whitespace-nowrap transition-all ${
            unit === u
              ? 'apple-btn-primary text-black shadow-sm'
              : 'text-muted-foreground hover:text-white'
          }`}
        >
          {weightUnitOptionLabel(u)}
        </button>
      ))}
    </div>
  );

  const CurrencySelect = ({ fullWidth = false, settings = false }: { fullWidth?: boolean; settings?: boolean }) => (
    <Select value={displayCurrency} onValueChange={(v) => setDisplayCurrency(v as Currency)}>
      <SelectTrigger
        className={`${settings ? 'w-[160px] max-w-full h-11' : fullWidth ? 'w-full h-11' : 'w-auto min-w-[4.5rem] h-10'} bg-white/[0.06] border border-white/[0.08] text-xs text-white px-2.5 gap-1.5 rounded-full focus:ring-0`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-[#1C1C1E] border-white/10 text-white">
        {CURRENCY_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="dashboard-viewport relative w-full flex flex-col bg-[#0B0D0F] text-foreground">

      {/* ══════════════════════════════════════════════════
          1. iOS TOP CHROME NAVIGATION BAR (44px + Safe Area) (§12)
          No "Overview" or "Add Trade" buttons (§1)
      ══════════════════════════════════════════════════ */}
      <nav
        className="apple-chrome fixed top-0 left-0 right-0 z-40 flex flex-col justify-end pt-[env(safe-area-inset-top,0px)]"
        style={{
          borderBottom: scrollY > 15 ? '0.5px solid rgba(255, 255, 255, 0.12)' : '0.5px solid transparent',
          transition: 'border-color 200ms ease-out',
        }}
      >
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-[44px] flex items-center justify-between">
          {/* Left: Compact Inline Brand Icon & Title (Fix 2) */}
          <div className="flex items-center gap-2.5">
            <GoldAppIcon size={26} hasGlow={false} />
            <span className="text-sm font-semibold tracking-tight text-white leading-none">
              Gold Tracker <span className="text-[#E5A93C]">Pro</span>
            </span>
          </div>

          {/* Right: Controls & Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <LangToggle />
              <UnitToggle />
              <CurrencySelect />
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-muted-foreground hover:text-white h-10 w-10 rounded-full bg-white/[0.06] border border-white/[0.08]"
                title={lang === 'cn' ? '退出登录' : 'Sign Out'}
              >
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Mobile Sheet Trigger */}
            <div className="flex items-center">
              <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-white h-11 w-11 rounded-full bg-white/[0.06] border border-white/[0.08]"
                    aria-label={lang === 'cn' ? '设置' : 'Settings'}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[min(200px,calc(100vw-2rem))] bg-[#1C1C1E] border-l border-white/[0.08] p-0"
                >
                  <SheetHeader className="px-[19px] pt-6 pb-4 border-b border-white/[0.06]">
                    <SheetTitle className="text-sm font-semibold text-white text-left">
                      {lang === 'cn' ? '设置' : 'Settings'}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="px-[19px] py-5 space-y-5">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSettingsOpen(false);
                        setProviderSettingsOpen(true);
                      }}
                      className="w-full justify-start gap-2 px-0 text-sm text-white hover:bg-transparent hover:text-[#F0B94C]"
                    >
                      <Sparkles className="h-4 w-4 text-[#E5A93C]" />
                      {t.aiProviderSettingsMenu}
                    </Button>
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">
                        {lang === 'cn' ? '显示货币' : 'Display Currency'}
                      </p>
                      <CurrencySelect settings />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">
                        {lang === 'cn' ? '计量单位' : 'Weight Unit'}
                      </p>
                      <UnitToggle settings />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">
                        {lang === 'cn' ? '界面语言' : 'Language'}
                      </p>
                      <LangToggle />
                    </div>
                    <div className="pt-4 border-t border-white/[0.06]">
                      <Button
                        variant="ghost"
                        onClick={signOut}
                        className="w-full justify-start text-sm text-muted-foreground hover:text-white gap-2 px-0"
                      >
                        <LogOut className="w-4 h-4" />
                        {lang === 'cn' ? '退出登录' : 'Sign Out'}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════
          2. RESPONSIVE VIEWPORT CONTAINER (§5)
          Desktop (≥1024px): 100vh locked scene
          Mobile (<1024px): Natural touch vertical scrolling
      ══════════════════════════════════════════════════ */}
      <main
        ref={scrollContainerRef}
        className="flex-1 w-full pt-[calc(44px+env(safe-area-inset-top,0px))] pb-[calc(24px+env(safe-area-inset-bottom,0px))] overflow-y-auto"
      >
        <div className="dashboard-grid max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 grid grid-cols-1 gap-3 sm:gap-4 items-stretch lg:grid-cols-5">
          {/* Mobile order: Portfolio, Add Trade, Market, Transactions. Desktop rows use a 3:2 width ratio. */}
          <div className="dashboard-slot-portfolio min-w-0 lg:col-span-3">
            <TradeSummary
              trades={trades}
              currentPrice={currentPrice}
              convert={convert}
              displayCurrency={displayCurrency}
              unit={unit}
              fxFreshness={fxFreshness}
              fxLastUpdated={fxLastUpdated}
            />
          </div>

          <div className="dashboard-slot-add-trade min-w-0 min-h-[280px] lg:col-span-2">
            <AddTradeForm
              onAdd={addTrade}
              currentPrice={currentPrice}
              convert={convert}
              displayCurrency={displayCurrency}
              unit={unit}
            />
          </div>

          <div className="dashboard-slot-market min-w-0 min-h-[440px] lg:col-span-3">
            <GoldPriceChart
              prices={prices}
              currentPrice={currentPrice}
              lastUpdated={lastUpdated}
              freshness={freshness}
              onRefresh={refetch}
              loading={loading}
              convert={convert}
              displayCurrency={displayCurrency}
              unit={unit}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </div>

          <div className="dashboard-slot-transactions min-w-0 min-h-[440px] lg:col-span-2">
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
      </main>

      {/* Chat is reachable from the same floating advisor control on every viewport. */}
      <GoldAdvisorChat
        currentPrice={currentPrice}
        open={chatOpen}
        onOpenChange={(isOpen) => {
          setChatOpen(isOpen);
        }}
      />
      <AIProviderSettings open={providerSettingsOpen} onOpenChange={setProviderSettingsOpen} />

    </div>
  );
};

export default Index;
