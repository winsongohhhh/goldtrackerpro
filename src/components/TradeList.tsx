import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { GoldTrade, Currency } from '@/lib/gold-types';
import { formatCurrency } from '@/lib/gold-types';
import { useI18n } from '@/lib/i18n';

interface Props {
  trades: GoldTrade[];
  currentPrice: number; // USD per gram
  onDelete: (id: string) => void;
  convert: (usd: number, to: Currency) => number;
  displayCurrency: Currency;
}

export function TradeList({ trades, currentPrice, onDelete, convert, displayCurrency }: Props) {
  const { t } = useI18n();

  if (trades.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t.noTrades}
      </div>
    );
  }

  // currentPrice is USD/g. Trade price is in trade.currency/g.
  // PnL = (currentPriceInTradeCurrency - trade.price) * trade.quantity, then convert to display currency
  const getPnL = (trade: GoldTrade): number => {
    // Convert current USD/g price to trade currency for comparison
    const currentInTradeCurrency = convert(currentPrice, trade.currency);
    const pnlInTradeCurrency = (currentInTradeCurrency - trade.price) * trade.quantity;
    // Convert PnL back to USD, then to display currency
    // pnlInTradeCurrency / rate(tradeCurrency) = pnlInUSD
    const rateToTrade = convert(1, trade.currency); // 1 USD = X tradeCurrency
    const pnlUSD = rateToTrade > 0 ? pnlInTradeCurrency / rateToTrade : 0;
    return convert(pnlUSD, displayCurrency);
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
            return (
              <TableRow key={trade.id} className="border-border">
                <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                <TableCell className="font-mono">{trade.date}</TableCell>
                <TableCell className="font-mono">
                  {formatCurrency(trade.price, trade.currency)}/g
                </TableCell>
                <TableCell className="font-mono">
                  {trade.quantity}g
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
