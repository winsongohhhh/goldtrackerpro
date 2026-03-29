const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function fetchYahooQuote(symbol: string): Promise<number | null> {
  // Try v8 chart endpoint (more reliable than v6 quote)
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) {
      const data = await res.json();
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof price === 'number' && price > 0) return price;
    }
  } catch { /* fallback */ }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'chart';

    if (mode === 'fx') {
      // Fetch exchange rates from Yahoo Finance using currency pair symbols
      const pairs = ['USDCNY', 'USDEUR', 'USDMYR', 'USDSGD'];
      const symbols = pairs.map(p => `${p}=X`).join(',');
      
      const rates: Record<string, number> = { USD: 1 };
      
      // Fetch all pairs via Yahoo chart endpoint
      const results = await Promise.all(
        pairs.map(async (pair) => {
          const symbol = `${pair}=X`;
          const price = await fetchYahooQuote(symbol);
          return { pair, price };
        })
      );
      
      for (const { pair, price } of results) {
        if (price) {
          const currency = pair.replace('USD', '');
          rates[currency] = price;
        }
      }

      return new Response(JSON.stringify({ rates }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'quote') {
      // Real-time gold quote via Yahoo Finance chart endpoint
      const price = await fetchYahooQuote('GC=F');
      if (price) {
        return new Response(JSON.stringify({ price }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to fetch gold price' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Chart mode (historical data)
    const interval = url.searchParams.get('interval') || '5m';
    const range = url.searchParams.get('range') || '1d';

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=${interval}&range=${range}`;
    
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
