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
    buyPrice: 'Buy Price',
    quantity: 'Quantity',
    currency: 'Currency',
    unit: 'Unit',
    add: 'Add',
    currentPrice: 'Current',
    noTrades: 'No trades yet. Add your first trade above.',
    noTradesPortfolio: 'No trades yet — add your first purchase below.',
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
    perGram: '/g',
    perOz: '/oz',
    // Phase 2A additions
    portfolio: 'Portfolio',
    market: 'Market',
    portfolioStats: 'Portfolio Statistics',
    totalHoldings: 'Total Holdings',
    totalInvested: 'Total Invested',
    currentValue: 'Current Value',
    unrealizedPnl: 'Unrealized P&L',
    pnlPercent: 'Return',
    averagePurchasePrice: 'Avg Purchase Price',
    numTrades: 'Trades',
    livePrice: 'Live Price',
    // Stitch UI additions
    premium: 'PREMIUM',
    holdingShare: 'Holdings',
    holdingQty: 'Holding Quantity',
    currentMarketValue: 'Current Market Value',
    unrealizedPnlShort: 'Unrealized P&L',
    yieldRate: 'Return',
    marketCondition: 'Market',
    liveGoldPrice: 'Live Gold Price',
    addTradeTitle: 'Add Trade',
    quickMarketBuy: 'Market Price Buy',
    settlementCurrency: 'Currency',
    measuringUnit: 'Unit',
    buyUnitPrice: 'Buy Price',
    tradeQuantity: 'Quantity',
    addRecordBtn: '+ Add Trade',
    transactionRecords: 'Transactions',
    viewAll: 'View All',
    presentValue: 'Value',
    costValue: 'Cost',
    goldAdvisorHelp: 'Gold Advisor',
    loginSubtitle: 'Sign in to sync your trades and real-time assets',
    googleContinue: 'Continue with Google',
    appleContinue: 'Sign in with Apple',
    orEmailPassword: 'or use email & password',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    forgotPassword: 'Forgot password?',
    rememberDevice: 'Keep me signed in on this device',
    passkeySupport: 'Passkey supported',
    loginAction: 'Sign In',
    registerAction: 'Sign Up',
    noAccountYet: "Don't have an account?",
    registerNow: 'Sign up now',
    alreadyHaveAccount: 'Already have an account?',
    signInNow: 'Sign in now',
    bankGradeEncryption: '256-bit bank-grade encryption · Local secure storage',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    systemStatus: 'System Status',
    syncNormal: 'Market sync normal',
    versionTag: 'v2.4.0 Stable',
    allRightsReserved: 'All rights reserved.',
  },
  cn: {
    appTitle: '◆ 黄金记账',
    appSubtitle: '实时价格追踪 · 交易盈亏分析',
    priceChart: '实时价格走势',
    updated: '更新',
    tradeSummary: '总览',
    addTrade: '添加交易',
    tradeList: '交易记录',
    buyPrice: '买入价',
    quantity: '数量',
    currency: '货币',
    unit: '单位',
    add: '添加',
    currentPrice: '当前',
    noTrades: '暂无交易记录，点击上方添加您的第一笔交易',
    noTradesPortfolio: '暂无交易记录，请在下方添加第一笔买入',
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
    perGram: '/克',
    perOz: '/盎司',
    // Phase 2A additions
    portfolio: '持仓概览',
    market: '市场行情',
    portfolioStats: '投资统计',
    totalHoldings: '持仓数量',
    totalInvested: '总投入',
    currentValue: '当前市值',
    unrealizedPnl: '未实现盈亏',
    pnlPercent: '收益率',
    averagePurchasePrice: '平均买入价',
    numTrades: '交易笔数',
    livePrice: '实时金价',
    // Stitch UI additions
    premium: 'PREMIUM',
    holdingShare: '持仓份额',
    holdingQty: '持仓数量',
    currentMarketValue: '当前市值',
    unrealizedPnlShort: '未实现盈亏',
    yieldRate: '收益率',
    marketCondition: '市场行情',
    liveGoldPrice: '实时金价',
    addTradeTitle: '添加交易',
    quickMarketBuy: '快捷市价买入',
    settlementCurrency: '货币',
    measuringUnit: '单位',
    buyUnitPrice: '买入价',
    tradeQuantity: '数量',
    addRecordBtn: '+ 添加记录',
    transactionRecords: '交易记录',
    viewAll: '查看明细',
    presentValue: '现值',
    costValue: '成本',
    goldAdvisorHelp: '黄金投顾助手',
    loginSubtitle: '登录以同步您的交易记录与实时资产',
    googleContinue: '使用 Google 账号继续',
    appleContinue: '使用 Apple 账号登录',
    orEmailPassword: '或使用邮箱密码',
    emailLabel: '电子邮箱',
    passwordLabel: '账户密码',
    forgotPassword: '忘记密码？',
    rememberDevice: '在此设备保持登录',
    passkeySupport: 'Passkey 支持',
    loginAction: '登录',
    registerAction: '注册',
    noAccountYet: '还没有 Gold Tracker 账户？',
    registerNow: '立即注册',
    alreadyHaveAccount: '已有账户？',
    signInNow: '立即登录',
    bankGradeEncryption: '256位银行级加密传输 · 本地安全加密存储',
    termsOfService: '服务条款',
    privacyPolicy: '隐私政策',
    systemStatus: '系统状态',
    syncNormal: '实时行情同步正常',
    versionTag: 'v2.4.0 稳定版',
    allRightsReserved: '保留所有权利。',
  },
} as const;

type Translations = Record<keyof typeof translations['en'], string>;

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
