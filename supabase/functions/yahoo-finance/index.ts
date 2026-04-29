const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'chart';
    const GOLD_API_KEY = Deno.env.get('GOLD_API_KEY') || '';

    if (mode === 'fx') {
      // Use fawazahmed0 currency API (free, no key needed)
      const currencies = ['cny', 'eur', 'myr', 'sgd'];
      const rates: Record<string, number> = { USD: 1 };

      try {
        const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
        if (res.ok) {
          const data = await res.json();
          const usdRates = data?.usd;
          if (usdRates) {
            for (const c of currencies) {
              if (usdRates[c]) {
                rates[c.toUpperCase()] = usdRates[c];
              }
            }
          }
        }
      } catch {
        // fallback: try alternative URL
        try {
          const res = await fetch('https://latest.currency-api.pages.dev/v1/currencies/usd.json');
          if (res.ok) {
            const data = await res.json();
            const usdRates = data?.usd;
            if (usdRates) {
              for (const c of currencies) {
                if (usdRates[c]) {
                  rates[c.toUpperCase()] = usdRates[c];
                }
              }
            }
          }
        } catch { /* keep defaults */ }
      }

      return new Response(JSON.stringify({ rates }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'quote') {
      // Primary: Yahoo Finance GC=F (COMEX gold futures) — matches mainstream financial sites
      try {
        const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d', {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        if (res.ok) {
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          const price = meta?.regularMarketPrice;
          if (typeof price === 'number' && price > 0) {
            return new Response(JSON.stringify({ price }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      } catch { /* fallback */ }

      // Fallback: TradingView TVC:GOLD (spot)
      try {
        const res = await fetch('https://scanner.tradingview.com/cfd/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbols: { tickers: ['TVC:GOLD'] },
            columns: ['close'],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const price = data?.data?.[0]?.d?.[0];
          if (typeof price === 'number' && price > 0) {
            return new Response(JSON.stringify({ price }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      } catch { /* fall through */ }

      return new Response(JSON.stringify({ error: 'Failed to fetch gold price' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Chart mode (historical data) - use Gold-API.com history
    // Gold-API free tier has limited historical, so we fall back to Yahoo for charts
    const interval = url.searchParams.get('interval') || '5m';
    const range = url.searchParams.get('range') || '1d';

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=${interval}&range=${range}`;
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

    const res = await fetch(yahooUrl, {
      headers: { 'User-Agent': UA },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Yahoo returned ${res.status}` }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
