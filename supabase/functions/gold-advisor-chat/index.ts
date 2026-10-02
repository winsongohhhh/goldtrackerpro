import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OZ_TO_GRAM = 31.1035;
const MODEL = "gemini-3-flash-preview";

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
    const url =
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GoldAdvisor/1.0)",
      },
    });

    if (!resp.ok) {
      console.error("Search HTTP error:", resp.status);
      return "";
    }

    const html = await resp.text();

    const snippets: string[] = [];
    const resultRegex =
      /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while (
      (match = resultRegex.exec(html)) !== null &&
      snippets.length < 6
    ) {
      const text = match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .trim();

      if (text.length > 20) {
        snippets.push(text);
      }
    }

    const titleRegex =
      /<a class="result__a"[^>]*>([\s\S]*?)<\/a>/gi;

    const titles: string[] = [];

    while (
      (match = titleRegex.exec(html)) !== null &&
      titles.length < 6
    ) {
      const text = match[1]
        .replace(/<[^>]+>/g, "")
        .trim();

      if (text.length > 5) {
        titles.push(text);
      }
    }

    if (snippets.length === 0) {
      return "";
    }

    let result = "";

    for (let i = 0; i < snippets.length; i++) {
      result += `${i + 1}. ${titles[i] || ""}: ${snippets[i]}\n`;
    }

    return result;
  } catch (e) {
    console.error("Search error:", e);
    return "";
  }
}

function extractSearchQuery(userMessage: string, lang: string): string {
  const goldKeywords =
    lang === "cn"
      ? "黄金 金价 最新"
      : "gold price latest";

  return `${userMessage} ${goldKeywords} 2026`;
}

function convertMessages(
  messages: Array<{ role: string; content: string }>,
) {
  const conversation = messages.filter(
    (message) => message.role === "user" || message.role === "assistant",
  );

  // Gemini contents must start with a user turn. The frontend welcome
  // assistant message is UI-only and must not lead the conversation.
  const firstUserIndex = conversation.findIndex(
    (message) => message.role === "user",
  );

  const turns =
    firstUserIndex === -1 ? [] : conversation.slice(firstUserIndex);

  return turns.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [
      {
        text: message.content,
      },
    ],
  }));
}

function createOpenAIChunk(content: string) {
  return `data: ${
    JSON.stringify({
      choices: [
        {
          delta: {
            content,
          },
        },
      ],
    })
  }\n\n`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const {
      messages = [],
      lang = "en",
      currentPrice,
    } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const lastUserMsg = [...messages]
      .reverse()
      .find((message: { role: string }) => message.role === "user");

    let searchContext = "";

    if (lastUserMsg) {
      const query = extractSearchQuery(
        lastUserMsg.content,
        lang,
      );

      console.log("Proactive search:", query);

      searchContext = await fetchSearchResults(query);

      if (searchContext) {
        console.log(
          "Search results found, length:",
          searchContext.length,
        );
      }
    }

    const systemPrompt = buildSystemPrompt(
      lang,
      currentPrice,
      searchContext || undefined,
    );

    const geminiMessages = convertMessages(messages);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": GEMINI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemPrompt,
              },
            ],
          },
          contents: geminiMessages,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Gemini API error:",
        response.status,
        errorText,
      );

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "请求过于频繁，请稍后再试。",
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      return new Response(
        JSON.stringify({
          error: "Gemini AI 服务暂时不可用",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (!response.body) {
      throw new Error("Gemini returned an empty response");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              break;
            }

            buffer += decoder.decode(value, {
              stream: true,
            });

            let newlineIndex;

            while (
              (newlineIndex = buffer.indexOf("\n")) !== -1
            ) {
              let line = buffer.slice(0, newlineIndex);
              buffer = buffer.slice(newlineIndex + 1);

              if (line.endsWith("\r")) {
                line = line.slice(0, -1);
              }

              if (!line.startsWith("data:")) {
                continue;
              }

              const jsonText = line
                .slice(5)
                .trim();

              if (!jsonText) {
                continue;
              }

              try {
                const chunk = JSON.parse(jsonText);

                const text =
                  chunk?.candidates?.[0]?.content?.parts
                    ?.map((part: { text?: string }) => part.text || "")
                    .join("") || "";

                if (text) {
                  controller.enqueue(
                    new TextEncoder().encode(
                      createOpenAIChunk(text),
                    ),
                  );
                }
              } catch (parseError) {
                console.error(
                  "Gemini chunk parse error:",
                  parseError,
                );
              }
            }
          }

          controller.enqueue(
            new TextEncoder().encode(
              "data: [DONE]\n\n",
            ),
          );

          controller.close();
        } catch (error) {
          console.error(
            "Gemini stream error:",
            error,
          );

          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("chat error:", e);

    return new Response(
      JSON.stringify({
        error:
          e instanceof Error
            ? e.message
            : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});