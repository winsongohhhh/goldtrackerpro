import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import type { GoldTrade } from '@/lib/gold-types';
import { convertToGrams, OZ_TO_GRAM, formatCurrency } from '@/lib/gold-types';

interface Props {
  trades: GoldTrade[];
  currentPrice: number; // USD per oz
  onDelete: (id: string) => void;
}

export function TradeList({ trades, currentPrice, onDelete }: Props) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        暂无交易记录，点击上方添加您的第一笔交易
      </div>
    );
  }

  const getPnL = (trade: GoldTrade): number => {
    // Convert trade price to USD per oz for comparison
    const tradePerOz = trade.unit === 'g' ? trade.price * OZ_TO_GRAM : trade.price;
    const quantityInOz = trade.unit === 'g' ? trade.quantity / OZ_TO_GRAM : trade.quantity;
    // Simple PnL: (current - buy) * quantity
    // Assuming all trades are in USD for simplicity
    return (currentPrice - tradePerOz) * quantityInOz;
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">#</TableHead>
            <TableHead className="text-muted-foreground">日期</TableHead>
            <TableHead className="text-muted-foreground">买入价</TableHead>
            <TableHead className="text-muted-foreground">数量</TableHead>
            <TableHead className="text-muted-foreground">货币</TableHead>
            <TableHead className="text-muted-foreground">盈亏</TableHead>
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
                    {isProfit ? '+' : ''}{formatCurrency(pnl, trade.currency)}
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
