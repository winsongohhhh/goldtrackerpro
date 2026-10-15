import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { validateAIProviderConfiguration, type AIProviderConfiguration, type AIProviderId } from "../../../src/lib/ai-providers.ts";

export type ProviderId = AIProviderId;
export type ChatMessage = { role: "user" | "assistant"; content: string };
export type ProviderConfig = AIProviderConfiguration;

export function isProviderId(value: unknown): value is ProviderId {
  return value === "openai" || value === "anthropic" || value === "google";
}

export const validateProviderConfig = validateAIProviderConfiguration;

function endpointFor(config: ProviderConfig, stream: boolean): string {
  if (config.provider === "openai") return "https://api.openai.com/v1/responses";
  if (config.provider === "anthropic") return "https://api.anthropic.com/v1/messages";
  const method = stream ? "streamGenerateContent?alt=sse" : "generateContent";
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:${method}`;
}

export function buildProviderRequest(
  config: ProviderConfig,
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
  stream: boolean,
  maxOutputTokens = 2048,
): { url: string; headers: Record<string, string>; body: string } {
  const url = endpointFor(config, stream);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let payload: Record<string, unknown>;

  if (config.provider === "openai") {
    headers.Authorization = `Bearer ${apiKey}`;
    payload = {
      model: config.model,
      instructions: systemPrompt,
      input: messages.map((message) => ({ role: message.role, content: message.content })),
      stream,
      max_output_tokens: maxOutputTokens,
    };
  } else if (config.provider === "anthropic") {
    headers["x-api-key"] = apiKey;
    headers["anthropic-version"] = "2023-06-01";
    payload = {
      model: config.model,
      system: systemPrompt,
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
      max_tokens: maxOutputTokens,
      stream,
    };
  } else {
    headers["x-goog-api-key"] = apiKey;
    payload = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      generationConfig: { maxOutputTokens },
    };
  }

  return { url, headers, body: JSON.stringify(payload) };
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const encoded = Deno.env.get("AI_PROVIDER_ENCRYPTION_KEY");
  if (!encoded) throw new Error("ENCRYPTION_KEY_UNAVAILABLE");
  let raw: Uint8Array;
  try {
    raw = fromBase64(encoded);
  } catch {
    throw new Error("ENCRYPTION_KEY_INVALID");
  }
  if (raw.byteLength !== 32) throw new Error("ENCRYPTION_KEY_INVALID");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function keyContext(userId: string, provider: ProviderId): Uint8Array {
  return new TextEncoder().encode(`gold-advisor-provider:v1:${userId}:${provider}`);
}

export async function encryptApiKey(apiKey: string, userId: string, provider: ProviderId) {
  const encryptionKey = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: keyContext(userId, provider), tagLength: 128 },
    encryptionKey,
    new TextEncoder().encode(apiKey),
  );
  return { ciphertext: toBase64(new Uint8Array(ciphertext)), iv: toBase64(iv) };
}

export async function decryptApiKey(
  ciphertext: string,
  iv: string,
  userId: string,
  provider: ProviderId,
): Promise<string> {
  const encryptionKey = await getEncryptionKey();
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(iv),
      additionalData: keyContext(userId, provider),
      tagLength: 128,
    },
    encryptionKey,
    fromBase64(ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

export function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("SUPABASE_SERVER_CONFIG_UNAVAILABLE");
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function authenticateUser(request: Request): Promise<string | null> {
  const authorization = request.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!token || !url || !anonKey) return null;
  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}
