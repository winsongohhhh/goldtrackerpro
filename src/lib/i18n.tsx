import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'cn';

const translations = {
  en: {
    appTitle: '◆ Gold Tracker',
    appSubtitle: 'Real-time price tracking · Trade P&L analysis',
    priceChart: 'Live Price Chart',
    updated: 'Updated',
    tradeSummary: 'Summary',
    addTrade: 'Add Trade',
    tradeList: 'Trade History',
    buyPrice: 'Buy Price (per oz)',
    quantity: 'Quantity',
    unit: 'Unit',
    currency: 'Currency',
    add: 'Add',
    currentPrice: 'Current',
    noTrades: 'No trades yet. Add your first trade above.',
    date: 'Date',
    price: 'Price',
    pnl: 'P&L',
    totalHolding: 'Total Holding',
    avgCost: 'Avg Cost',
    marketValue: 'Market Value',
    totalPnL: 'Total P&L',
    loading: 'Loading price data...',
    goldPrice: 'Gold Price',
    displayCurrency: 'Display Currency',
    gram: 'Gram (g)',
    ounce: 'Ounce (oz)',
  },
  cn: {
    appTitle: '◆ 黄金记账',
    appSubtitle: '实时价格追踪 · 交易盈亏分析',
    priceChart: '实时价格走势',
    updated: '更新',
    tradeSummary: '总览',
    addTrade: '添加交易',
    tradeList: '交易记录',
    buyPrice: '买入价 (每盎司)',
    quantity: '数量',
    unit: '单位',
    currency: '货币',
    add: '添加',
    currentPrice: '当前',
    noTrades: '暂无交易记录，点击上方添加您的第一笔交易',
    date: '日期',
    price: '价格',
    pnl: '盈亏',
    totalHolding: '总持仓',
    avgCost: '平均成本',
    marketValue: '当前市值',
    totalPnL: '总盈亏',
    loading: '加载价格数据中...',
    goldPrice: '金价',
    displayCurrency: '显示货币',
    gram: '克 (g)',
    ounce: '盎司 (oz)',
  },
} as const;

type Translations = typeof translations['en'];

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('gold-lang') as Language) || 'cn';
  });

  const handleSetLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('gold-lang', l);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t: translations[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
