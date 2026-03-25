import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { GoldTrade, Currency } from '@/lib/gold-types';
import { OZ_TO_GRAM, formatCurrency } from '@/lib/gold-types';
import { useI18n } from '@/lib/i18n';

interface Props {
  trades: GoldTrade[];
  currentPrice: number;
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

  const getPnL = (trade: GoldTrade): number => {
    const tradePerOz = trade.unit === 'g' ? trade.price * OZ_TO_GRAM : trade.price;
    const quantityInOz = trade.unit === 'g' ? trade.quantity / OZ_TO_GRAM : trade.quantity;
    return (currentPrice - tradePerOz) * quantityInOz;
  };

  const dc = displayCurrency;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">#</TableHead>
            <TableHead className="text-muted-foreground">{t.date}</TableHead>
            <TableHead className="text-muted-foreground">{t.buyPrice}</TableHead>
            <TableHead className="text-muted-foreground">{t.quantity}</TableHead>
            <TableHead className="text-muted-foreground">{t.currency}</TableHead>
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
                  {formatCurrency(trade.price, trade.currency)}/{trade.unit}
                </TableCell>
                <TableCell className="font-mono">
                  {trade.quantity} {trade.unit}
                </TableCell>
                <TableCell>{trade.currency}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1 font-mono font-medium ${isProfit ? 'text-success' : 'text-destructive'}`}>
                    {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {isProfit ? '+' : ''}{formatCurrency(convert(pnl, dc), dc)}
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
