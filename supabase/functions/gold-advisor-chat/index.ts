import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OZ_TO_GRAM = 31.1035;
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

function buildSystemPrompt(lang: string, currentPricePerGram?: number) {
  let priceContext = '';
  if (currentPricePerGram && currentPricePerGram > 0) {
    const perOz = (currentPricePerGram * OZ_TO_GRAM).toFixed(2);
    const perGram = currentPricePerGram.toFixed(2);
    priceContext = `

【实时金价数据 / Real-time Gold Price Data — MANDATORY USE】
- Gold price per gram: $${perGram} USD/g
- Gold price per troy ounce: $${perOz} USD/oz
- 1 troy ounce = 31.1035 grams

⚠️ ABSOLUTE RULE: You MUST use ONLY these exact prices. The per-gram price is ~$${perGram}, the per-ounce price is ~$${perOz}. NEVER confuse these two. NEVER invent or guess prices. If asked about price, quote both units clearly.`;
  }

  if (lang === 'cn') {
    return `你是一位经验丰富的职业黄金分析师顾问。你精通全球黄金市场、技术分析、基本面分析、地缘政治对金价的影响，以及各种黄金投资工具（现货黄金、期货、ETF、实物金等）。
${priceContext}

你的职责是：
- 为用户提供专业的黄金市场分析和投资建议
- 解读市场趋势、技术指标和宏观经济因素
- 回答关于黄金投资策略、风险管理和市场知识的问题
- 用通俗易懂的语言解释复杂的金融概念

重要规则：
- 你只讨论与黄金、贵金属和相关金融市场的话题
- 如果用户问非黄金相关的话题，礼貌地引导回黄金话题
- 始终提醒用户投资有风险，你的建议仅供参考
- 用中文回复用户，除非用户使用其他语言
- 【严禁】编造或猜测任何价格数据。只能使用上方提供的实时价格。注意区分"每盎司"和"每克"的价格，绝对不能混淆
- 你拥有联网搜索能力，当用户问到最新新闻、地缘政治事件、市场动态时，你必须主动搜索获取最新信息再回答`;
  }

  return `You are an experienced professional gold analyst advisor. You are an expert in global gold markets, technical analysis, fundamental analysis, geopolitical impacts on gold prices, and various gold investment instruments (spot gold, futures, ETFs, physical gold, etc.).
${priceContext}

Your responsibilities:
- Provide professional gold market analysis and investment advice
- Interpret market trends, technical indicators, and macroeconomic factors
- Answer questions about gold investment strategies, risk management, and market knowledge
- Explain complex financial concepts in plain language

Important rules:
- Only discuss topics related to gold, precious metals, and related financial markets
- If the user asks about non-gold topics, politely redirect to gold topics
- Always remind users that investing carries risk and your advice is for reference only
- Reply in the same language the user uses
- NEVER fabricate or guess any price data. Only use the real-time prices provided above. Always distinguish between "per ounce" and "per gram" prices — never confuse the two
- You have web search capability. When users ask about latest news, geopolitical events, or market developments, you MUST proactively search for the latest information before answering`;
}

const searchTool = {
  type: "function",
  function: {
    name: "google_search",
    description: "Search the web for current gold market news, prices, geopolitical events, and analysis. Use this whenever the user asks about recent events, current market conditions, or anything that requires up-to-date information.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" }
      },
      required: ["query"]
    }
  }
};

async function fetchSearchResults(query: string): Promise<string> {
  try {
    // Use DuckDuckGo HTML search as a simple web search fallback
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GoldAdvisor/1.0)" }
    });
    const html = await resp.text();
    
    // Extract text snippets from results
    const snippets: string[] = [];
    const resultRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = resultRegex.exec(html)) !== null && snippets.length < 8) {
      const text = match[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim();
      if (text.length > 20) snippets.push(text);
    }
    
    // Also try to extract result titles and URLs
    const titleRegex = /<a class="result__a"[^>]*>([\s\S]*?)<\/a>/gi;
    const titles: string[] = [];
    while ((match = titleRegex.exec(html)) !== null && titles.length < 8) {
      const text = match[1].replace(/<[^>]+>/g, '').trim();
      if (text.length > 5) titles.push(text);
    }

    if (snippets.length === 0) {
      return `Search for "${query}" returned no results. Answer based on your training data and note that you couldn't find the latest information.`;
    }

    let result = `Web search results for "${query}":\n\n`;
    for (let i = 0; i < snippets.length; i++) {
      result += `${i + 1}. ${titles[i] || ''}\n${snippets[i]}\n\n`;
    }
    return result;
  } catch (e) {
    console.error("Search error:", e);
    return `Search failed for "${query}". Answer based on your training data.`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, lang = 'en', currentPrice } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = buildSystemPrompt(lang, currentPrice);
    const apiHeaders = {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    };

    // First call: non-streaming to check for tool calls
    const firstResponse = await fetch(GATEWAY, {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: [searchTool],
        stream: false,
      }),
    });

    if (!firstResponse.ok) {
      const status = firstResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试。" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI 额度已用完，请充值。" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await firstResponse.text();
      console.error("AI gateway error (1st):", status, t);
      return new Response(JSON.stringify({ error: "AI 服务暂时不可用" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstData = await firstResponse.json();
    const firstChoice = firstData.choices?.[0];
    const toolCalls = firstChoice?.message?.tool_calls;

    // Build the final messages array
    let finalMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    if (toolCalls && toolCalls.length > 0) {
      // Add the assistant message with tool calls
      finalMessages.push(firstChoice.message);

      // Execute each tool call
      for (const tc of toolCalls) {
        if (tc.function?.name === "google_search") {
          let query = "gold market latest news";
          try {
            const args = JSON.parse(tc.function.arguments);
            query = args.query || query;
          } catch {}
          
          console.log("Executing search:", query);
          const searchResult = await fetchSearchResults(query);
          
          finalMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: searchResult,
          });
        }
      }

      // Second call: streaming with search results
      const secondResponse = await fetch(GATEWAY, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: finalMessages,
          stream: true,
        }),
      });

      if (!secondResponse.ok) {
        const t = await secondResponse.text();
        console.error("AI gateway error (2nd):", secondResponse.status, t);
        return new Response(JSON.stringify({ error: "AI 服务暂时不可用" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(secondResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls - if finish_reason is "stop", the model answered directly
    // Re-do as streaming for consistent UX
    if (firstChoice?.finish_reason === "stop" && firstChoice?.message?.content) {
      // Stream the already-complete response as SSE
      const content = firstChoice.message.content;
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send content in chunks to simulate streaming
          const chunkSize = 20;
          for (let i = 0; i < content.length; i += chunkSize) {
            const chunk = content.slice(i, i + chunkSize);
            const data = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      });
      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Fallback: stream directly
    const streamResponse = await fetch(GATEWAY, {
      method: "POST",
      headers: apiHeaders,
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: finalMessages,
        stream: true,
      }),
    });

    return new Response(streamResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
