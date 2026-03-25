import { GoldPriceChart } from '@/components/GoldPriceChart';
import { AddTradeForm } from '@/components/AddTradeForm';
import { TradeList } from '@/components/TradeList';
import { TradeSummary } from '@/components/TradeSummary';
import { useGoldPrice } from '@/hooks/use-gold-price';
import { useTrades } from '@/hooks/use-trades';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { prices, currentPrice, loading, lastUpdated, refetch } = useGoldPrice();
  const { trades, addTrade, deleteTrade } = useTrades();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-primary">◆</span> 黄金记账
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              实时价格追踪 · 交易盈亏分析
            </p>
          </div>
          <div className="flex items-center gap-3">
            {currentPrice > 0 && (
              <div className="text-right">
                <div className="font-mono text-lg font-bold text-primary">
                  ${currentPrice.toFixed(2)}
                </div>
                <div className="text-[10px] text-muted-foreground">USD/oz</div>
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
              实时价格走势
            </h2>
            <span className="text-[10px] text-muted-foreground font-mono">
              更新: {lastUpdated.toLocaleTimeString('zh-CN')}
            </span>
          </div>
          <GoldPriceChart prices={prices} loading={loading} />
        </section>

        {/* Summary */}
        <TradeSummary trades={trades} currentPrice={currentPrice} />

        {/* Add Trade */}
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            添加交易
          </h2>
          <AddTradeForm onAdd={addTrade} currentPrice={currentPrice} />
        </section>

        {/* Trade List */}
        <section className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            交易记录
          </h2>
          <TradeList trades={trades} currentPrice={currentPrice} onDelete={deleteTrade} />
        </section>
      </div>
    </div>
  );
};

export default Index;
