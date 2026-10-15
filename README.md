# Gold Tracker Pro

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_%26_Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

Gold Tracker Pro

Gold Tracker Pro is a responsive personal gold-portfolio tracker. Record gold purchases and review holdings, costs, estimated value, and portfolio performance. The app records trades; it does not execute them.

Note: Gold Tracker Pro is for informational tracking only; it is not financial advice and does not execute trades. Investing in gold involves risk.

Features

Trade Logging: Record dated gold purchases with price, weight, and currency. Enter weight in grams or ounces, or quick-fill the current quote.

Portfolio Analytics: Review portfolio quantity, total invested, average cost, estimated current value, unrealized profit/loss, and return.

Transaction History: Inspect transaction history, including transaction-level value and P&L; deleted transactions can be undone.

Interactive Charts: Follow gold-price history with 7D, 1M, 6M, 1Y, and ALL chart ranges, manual refresh, and a freshness indicator.

Multi-Currency & Unit Support: Choose a display currency (USD, MYR, CNY, EUR, SGD) and weight unit. Supported display currencies are USD, MYR, CNY, EUR, and SGD. Gold quotes are displayed in USD per gram after conversion from a troy-ounce price.

Internationalization: Use English or Simplified Chinese.

Authentication: Sign in with email/password or Google OAuth.

Gold Advisor (AI Assistant): Open Gold Advisor, a gold-market-focused chat feature. It requires a user-supplied API key from OpenAI, Anthropic, or Google Gemini; there is no shared/default provider key. Provider usage is billed to the user by their provider.

Screenshots

Tech stack

Frontend: React 18, TypeScript, and Vite

Styling & Components: Tailwind CSS with Radix and shadcn-style UI components

Visualization: Lightweight Charts

Backend & Auth: Supabase Auth, Postgres, and Edge Functions

Getting started

Prerequisites

Node.js and npm

A configured Supabase project

Install dependencies

npm ci


Configure local environment

Create .env.local with your Supabase project URL and publishable key:

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key


Security Note: Use your own project values. Never commit .env, .env.local, credentials, or other secrets. There is no .env.example yet; add a template containing placeholder values before publishing.

Run locally

npm run dev


Run checks

npm test
npm run lint
npm run build


Use npm run preview to preview a production build locally.

Supabase deployment

The two browser environment variables are not enough for a complete deployment. Configure the Supabase project, database migrations, authentication providers (including Google OAuth if offered), Edge Functions (yahoo-finance, gold-advisor-provider, and gold-advisor-chat), and required server-side secrets. The Gold Advisor BYOK backend has not yet been deployed and runtime-tested; do not present the production Advisor as available until that work is complete and verified.

Market and currency data

Gold quote and chart-history data come from Yahoo Finance GC=F (COMEX gold futures). TradingView TVC:GOLD is used as a fallback for the current quote. The app polls the quote every 10 seconds and marks it stale after 30 seconds. Polling does not guarantee the upstream provider has published a new quote, and the quote is not guaranteed to be real-time spot pricing.

Foreign-exchange rates for CNY, EUR, MYR, and SGD per USD come from @fawazahmed0/currency-api via jsDelivr, with latest.currency-api.pages.dev as a fallback. The app polls every 30 seconds. If retrieval fails, hard-coded fallback rates are used and marked stale; upstream publication timing may vary.

Known limitations

Quotes and conversions may be delayed, stale, or unavailable. Verify prices independently before relying on them.

Gold Tracker Pro is for informational tracking only; it is not financial advice and does not execute trades. Investing in gold involves risk.

Gold Advisor requires the user to configure a supported provider key. Model usage is billed by the selected provider; no shared/default key is available. The BYOK backend needs deployment and runtime verification before the feature can be presented as production-ready.

No license has been selected, and the repository currently has no LICENSE file. Choose and add the intended license before publishing.

Contributing

Issues and pull requests are welcome. For larger changes, open an issue to discuss the proposal first. Include steps to reproduce bugs, and remove secrets or personal data from logs and screenshots.

License

Distributed under the MIT License. See `LICENSE` for more information.
