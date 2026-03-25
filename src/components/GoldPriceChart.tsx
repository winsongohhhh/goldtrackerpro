import { TradingViewWidget } from './TradingViewWidget';
import { useI18n } from '@/lib/i18n';

export function GoldPriceChart() {
  const { t } = useI18n();

  return (
    <section className="bg-card rounded-xl border border-border p-5">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        {t.priceChart}
      </h2>
      <TradingViewWidget />
    </section>
  );
}
