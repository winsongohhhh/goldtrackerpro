import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import type { GoldPrice } from '@/lib/gold-types';

interface Props {
  prices: GoldPrice[];
  loading: boolean;
}

export function GoldPriceChart({ prices, loading }: Props) {
  const data = useMemo(() => 
    prices.map(p => ({
      time: new Date(p.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      price: p.price,
    })),
    [prices]
  );

  const [min, max] = useMemo(() => {
    if (data.length === 0) return [0, 0];
    const vals = data.map(d => d.price);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = (hi - lo) * 0.1 || 10;
    return [Math.floor(lo - pad), Math.ceil(hi + pad)];
  }, [data]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">加载价格数据中...</div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(43, 80%, 55%)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(43, 80%, 55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="time" 
            stroke="hsl(220, 10%, 35%)" 
            fontSize={11} 
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis 
            domain={[min, max]} 
            stroke="hsl(220, 10%, 35%)" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `$${v}`}
            width={70}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(220, 18%, 12%)',
              border: '1px solid hsl(220, 15%, 22%)',
              borderRadius: '8px',
              color: 'hsl(40, 20%, 90%)',
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, '金价']}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="hsl(43, 80%, 55%)"
            strokeWidth={2}
            fill="url(#goldGradient)"
            dot={false}
            activeDot={{ r: 4, fill: 'hsl(43, 80%, 55%)', stroke: 'hsl(220, 20%, 7%)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
