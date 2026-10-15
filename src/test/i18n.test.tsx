import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider, useI18n } from '@/lib/i18n';

function LanguageProbe() {
  const { lang, t } = useI18n();
  return <><span>{lang}</span><p>{t.loginSubtitle}</p></>;
}

const originalLanguage = Object.getOwnPropertyDescriptor(window.navigator, 'language');

function setBrowserLanguage(language: string) {
  Object.defineProperty(window.navigator, 'language', { configurable: true, value: language });
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  localStorage.clear();
  if (originalLanguage) {
    Object.defineProperty(window.navigator, 'language', originalLanguage);
  } else {
    Reflect.deleteProperty(window.navigator, 'language');
  }
});

describe('I18nProvider initial language', () => {
  it('uses Simplified Chinese for a Chinese browser locale', () => {
    setBrowserLanguage('zh-TW');
    render(<I18nProvider><LanguageProbe /></I18nProvider>);

    expect(screen.getByText('cn')).toBeInTheDocument();
    expect(screen.getByText('登录以同步您的交易记录与实时资产')).toBeInTheDocument();
  });

  it('falls back to English for other browser locales', () => {
    setBrowserLanguage('fr-FR');
    render(<I18nProvider><LanguageProbe /></I18nProvider>);

    expect(screen.getByText('en')).toBeInTheDocument();
    expect(screen.getByText('Sign in to sync your trades and real-time assets')).toBeInTheDocument();
  });

  it('preserves a saved language choice over the browser locale', () => {
    setBrowserLanguage('en-US');
    localStorage.setItem('gold-lang', 'cn');
    render(<I18nProvider><LanguageProbe /></I18nProvider>);

    expect(screen.getByText('cn')).toBeInTheDocument();
    expect(localStorage.getItem('gold-lang')).toBe('cn');
  });
});
