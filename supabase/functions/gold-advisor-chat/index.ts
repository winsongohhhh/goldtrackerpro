import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authenticateUser,
  buildProviderRequest,
  createAdminClient,
  decryptApiKey,
  validateProviderConfig,
  type ChatMessage,
  type ProviderId,
} from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const OZ_TO_GRAM = 31.1035;

function buildSystemPrompt(
  lang: string,
  currentPricePerGram?: number,
  searchContext?: string,
) {
  let priceContext = "";

  if (currentPricePerGram && currentPricePerGram > 0) {
    const perOz = (currentPricePerGram * OZ_TO_GRAM).toFixed(2);
    const perGram = currentPricePerGram.toFixed(2);

    priceContext = `
【实时金价数据 / Real-time Gold Price Data — MANDATORY USE】

- Gold price per gram: $${perGram} USD/g
- Gold price per troy ounce: $${perOz} USD/oz
- 1 troy ounce = 31.1035 grams

⚠️ ABSOLUTE RULE:
You MUST use ONLY these exact prices.
NEVER confuse per-gram and per-ounce.
NEVER invent prices.
`;
  }

  let searchSection = "";

  if (searchContext) {
    searchSection = `
【最新网络搜索结果 / Latest Web Search Results】

${searchContext}

⚠️ You MUST incorporate these search results into your answer.
Cite specific recent events, dates, and facts from the results above.
Do NOT ignore this information.
`;
  }

  if (lang === "cn") {
    return `你是一位经验丰富的职业黄金分析师顾问。你精通全球黄金市场、技术分析、基本面分析、地缘政治对金价的影响，以及各种黄金投资工具。

${priceContext}${searchSection}

你的职责是：

- 为用户提供专业的黄金市场分析和投资建议
- 解读市场趋势、技术指标和宏观经济因素
- 回答关于黄金投资策略、风险管理和市场知识的问题

重要规则：

- 你只讨论与黄金、贵金属和相关金融市场的话题
- 如果用户问非黄金相关的话题，礼貌地引导回黄金话题
- 始终提醒用户投资有风险，你的建议仅供参考
- 用中文回复用户，除非用户使用其他语言
- 【严禁】编造或猜测任何价格数据
- 必须结合上方提供的最新搜索结果来回答，引用具体的最新事件和日期`;
  }

  return `You are an experienced professional gold analyst advisor. Expert in global gold markets, technical analysis, fundamental analysis, geopolitical impacts, and gold investment instruments.

${priceContext}${searchSection}

Your responsibilities:

- Provide professional gold market analysis and investment advice
- Interpret market trends, technical indicators, and macroeconomic factors
- Answer questions about gold investment strategies, risk management, and market knowledge

Important rules:

- Only discuss gold, precious metals, and related financial markets
- If user asks non-gold topics, politely redirect
- Always remind users investing carries risk
- Reply in the same language the user uses
- NEVER fabricate or guess price data
- You MUST incorporate the latest search results provided above into your answers, citing specific recent events and dates`;
}

async function fetchSearchResults(query: string): Promise<string> {
  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; GoldAdvisor/1.0)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return "";

    const html = await response.text();
    const snippets: string[] = [];
    const resultRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = resultRegex.exec(html)) !== null && snippets.length < 6) {
      const text = match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .trim();
      if (text.length > 20) snippets.push(text);
    }

    const titles: string[] = [];
    const titleRegex = /<a class="result__a"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = titleRegex.exec(html)) !== null && titles.length < 6) {
      const text = match[1].replace(/<[^>]+>/g, "").trim();
      if (text.length > 5) titles.push(text);
    }
    return snippets.map((snippet, index) => `${index + 1}. ${titles[index] || ""}: ${snippet}`).join("\n");
  } catch {
    return "";
  }
}

function extractSearchQuery(userMessage: string, lang: string): string {
  const goldKeywords = lang === "cn" ? "黄金 金价 最新" : "gold price latest";
  return `${userMessage} ${goldKeywords} 2026`;
}

function normalizeMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const messages: ChatMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const message = item as { role?: unknown; content?: unknown };
    if (message.role !== "user" && message.role !== "assistant") continue;
    if (typeof message.content !== "string" || message.content.length > 8000) return null;
    messages.push({ role: message.role, content: message.content });
  }
  const firstUser = messages.findIndex((message) => message.role === "user");
  if (firstUser < 0) return null;
  const turns = messages.slice(firstUser);
  if (turns.reduce((total, message) => total + message.content.length, 0) > 30_000) return null;
  return turns;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toClientChunk(content: string) {
  return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

function extractDelta(provider: ProviderId, chunk: Record<string, unknown>): string {
  if (provider === "openai") {
    return chunk.type === "response.output_text.delta" && typeof chunk.delta === "string" ? chunk.delta : "";
  }
  if (provider === "anthropic") {
    const delta = chunk.delta as { type?: string; text?: string } | undefined;
    return chunk.type === "content_block_delta" && delta?.type === "text_delta" && typeof delta.text === "string" ? delta.text : "";
  }
  if (provider === "google") {
    const candidates = chunk.candidates as Array<{ content?: { parts?: Array<{ text?: unknown }> } }> | undefined;
    return candidates?.[0]?.content?.parts?.map((part) => typeof part.text === "string" ? part.text : "").join("") ?? "";
  }
  return "";
}

function makeStream(upstream: Response, provider: ProviderId): ReadableStream<Uint8Array> {
  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      const processLine = (line: string) => {
        const normalized = line.endsWith("\r") ? line.slice(0, -1) : line;
        if (!normalized.startsWith("data:")) return;
        const data = normalized.slice(5).trim();
        if (!data || data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          const text = extractDelta(provider, parsed);
          if (text) controller.enqueue(encoder.encode(toClientChunk(text)));
        } catch {
          // Provider-specific SSE events that are not JSON text deltas are ignored.
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline = buffer.indexOf("\n");
          while (newline !== -1) {
            processLine(buffer.slice(0, newline));
            buffer = buffer.slice(newline + 1);
            newline = buffer.indexOf("\n");
          }
        }
        if (buffer.trim()) processLine(buffer);
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch {
        controller.error(new Error("Provider stream failed"));
      }
    },
    cancel() {
      void reader.cancel();
    },
  });
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);

  const userId = await authenticateUser(request);
  if (!userId) return jsonResponse({ error: "AUTH_REQUIRED" }, 401);

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return jsonResponse({ error: "INVALID_REQUEST" }, 400);
    const messages = normalizeMessages(body.messages);
    if (!messages) return jsonResponse({ error: "INVALID_MESSAGES" }, 400);

    const admin = createAdminClient();
    const { data: record, error: configError } = await admin
      .from("user_ai_provider_credentials")
      .select("provider, model, ciphertext, iv, key_version")
      .eq("user_id", userId)
      .maybeSingle();
    if (configError) return jsonResponse({ error: "PROVIDER_CONFIGURATION_UNAVAILABLE" }, 500);
    if (!record) return jsonResponse({ error: "AI_PROVIDER_NOT_CONFIGURED" }, 428);

    const config = validateProviderConfig({ provider: record.provider, model: record.model });
    if (!config || record.key_version !== 1) return jsonResponse({ error: "PROVIDER_CONFIGURATION_INVALID" }, 500);

    const apiKey = await decryptApiKey(record.ciphertext, record.iv, userId, config.provider);
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    const lang = body.lang === "cn" ? "cn" : "en";
    const currentPrice = typeof body.currentPrice === "number" && Number.isFinite(body.currentPrice) && body.currentPrice > 0
      ? body.currentPrice
      : undefined;
    const searchContext = lastUserMessage
      ? await fetchSearchResults(extractSearchQuery(lastUserMessage.content, lang))
      : "";
    const systemPrompt = buildSystemPrompt(lang, currentPrice, searchContext || undefined);
    const providerRequest = buildProviderRequest(config, apiKey, systemPrompt, messages, true);

    let providerResponse: Response;
    try {
      const requestOptions = {
        method: "POST",
        headers: providerRequest.headers,
        body: providerRequest.body,
        signal: AbortSignal.timeout(90_000),
        redirect: "error" as const,
      };
      providerResponse = await fetch(providerRequest.url, requestOptions);
    } catch {
      return jsonResponse({ error: "AI_PROVIDER_CONNECTION_FAILED" }, 502);
    }
    if (!providerResponse.ok) {
      return jsonResponse({ error: providerResponse.status === 429 ? "AI_PROVIDER_RATE_LIMITED" : "AI_PROVIDER_REQUEST_FAILED" }, providerResponse.status === 429 ? 429 : 502);
    }
    if (!providerResponse.body) return jsonResponse({ error: "AI_PROVIDER_EMPTY_RESPONSE" }, 502);

    return new Response(makeStream(providerResponse, config.provider), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store",
        Connection: "keep-alive",
      },
    });
  } catch {
    // Never log API keys, request content, provider response bodies, or raw exceptions.
    return jsonResponse({ error: "GOLD_ADVISOR_REQUEST_FAILED" }, 500);
  }
});
