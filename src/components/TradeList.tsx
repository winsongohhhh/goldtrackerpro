import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { GoldTrade, Currency, WeightUnit } from '@/lib/gold-types';
import { formatCurrency, priceForUnit, quantityForUnit } from '@/lib/gold-types';
import { useI18n } from '@/lib/i18n';

interface Props {
  trades: GoldTrade[];
  currentPrice: number; // USD per gram
  onDelete: (id: string) => void;
  convert: (usd: number, to: Currency) => number;
  displayCurrency: Currency;
  unit: WeightUnit;
}

export function TradeList({ trades, currentPrice, onDelete, convert, displayCurrency, unit }: Props) {
  const { t } = useI18n();
  const unitLabel = unit === 'oz' ? 'oz' : 'g';

  if (trades.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t.noTrades}
      </div>
    );
  }

  const getPnL = (trade: GoldTrade): number => {
    // Current price in display currency per gram
    const currentInDisplay = convert(currentPrice, displayCurrency);
    // Trade price: stored as per-gram in trade.currency. Convert to display currency.
    const rateToTrade = convert(1, trade.currency);
    const tradePriceUSD = rateToTrade > 0 ? trade.price / rateToTrade : 0;
    const tradePriceInDisplay = convert(tradePriceUSD, displayCurrency);
    // PnL per gram * quantity (in grams), then scale to unit for display
    const pnlPerGram = currentInDisplay - tradePriceInDisplay;
    return pnlPerGram * trade.quantity;
  };

  const getDisplayPrice = (trade: GoldTrade): string => {
    // Convert trade price (per gram in trade currency) to display currency per unit
    const rateToTrade = convert(1, trade.currency);
    const tradePriceUSD = rateToTrade > 0 ? trade.price / rateToTrade : 0;
    const inDisplay = convert(tradePriceUSD, displayCurrency);
    const perUnit = priceForUnit(inDisplay, unit);
    return `${formatCurrency(perUnit, displayCurrency)}/${unitLabel}`;
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">#</TableHead>
            <TableHead className="text-muted-foreground">{t.date}</TableHead>
            <TableHead className="text-muted-foreground">{t.buyPrice}</TableHead>
            <TableHead className="text-muted-foreground">{t.quantity}</TableHead>
            <TableHead className="text-muted-foreground">{t.pnl}</TableHead>
            <TableHead className="text-muted-foreground w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trades.map((trade, i) => {
            const pnl = getPnL(trade);
            const isProfit = pnl >= 0;
            const displayQty = quantityForUnit(trade.quantity, unit);
            return (
              <TableRow key={trade.id} className="border-border">
                <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-mono">{trade.date}</TableCell>
                <TableCell className="font-mono">
                  {getDisplayPrice(trade)}
                </TableCell>
                <TableCell className="font-mono">
                  {displayQty.toFixed(2)}{unitLabel}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1 font-mono font-medium ${isProfit ? 'text-success' : 'text-destructive'}`}>
                    {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {isProfit ? '+' : ''}{formatCurrency(pnl, displayCurrency)}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(trade.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
