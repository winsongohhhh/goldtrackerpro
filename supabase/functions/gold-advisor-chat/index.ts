import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildSystemPrompt(lang: string, currentPrice?: number) {
  const priceContext = currentPrice ? `\nCurrent real-time gold price: $${currentPrice} USD/oz.` : '';

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
- 用中文回复用户，除非用户使用其他语言`;
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
- Reply in the same language the user uses`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试。" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 额度已用完，请充值。" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI 服务暂时不可用" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
