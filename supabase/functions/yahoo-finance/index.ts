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

    if (mode === 'fx') {
      // Fetch live exchange rates
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'FX fetch failed' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await res.json();
      return new Response(JSON.stringify({ rates: data.rates }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mode === 'quote') {
      // Real-time quote via Yahoo Finance v6 quote endpoint
      const quoteUrl = 'https://query1.finance.yahoo.com/v6/finance/quote?symbols=GC=F';
      const res = await fetch(quoteUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });

      if (!res.ok) {
        const chartUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d';
        const chartRes = await fetch(chartUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        const chartData = await chartRes.json();
        const result = chartData?.chart?.result?.[0];
        const meta = result?.meta;
        const price = meta?.regularMarketPrice ?? 0;
        return new Response(JSON.stringify({ price }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await res.json();
      const q = data?.quoteResponse?.result?.[0];
      const price = q?.regularMarketPrice ?? 0;
      const bid = q?.bid ?? 0;
      const ask = q?.ask ?? 0;
      const mid = (bid > 0 && ask > 0) ? (bid + ask) / 2 : price;
      return new Response(JSON.stringify({ price: mid, bid, ask, regularMarketPrice: price }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Chart mode (historical data)
    const interval = url.searchParams.get('interval') || '5m';
    const range = url.searchParams.get('range') || '1d';

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=${interval}&range=${range}`;
    
    const res = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
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
