import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authenticateUser,
  buildProviderRequest,
  createAdminClient,
  encryptApiKey,
  validateProviderConfig,
} from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "METHOD_NOT_ALLOWED" }, 405);

  const userId = await authenticateUser(request);
  if (!userId) return jsonResponse({ error: "AUTH_REQUIRED" }, 401);

  try {
    const input = await request.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return jsonResponse({ error: "INVALID_REQUEST" }, 400);
    }

    const admin = createAdminClient();
    const action = input.action;

    if (action === "status") {
      const { data, error } = await admin
        .from("user_ai_provider_credentials")
        .select("provider, model")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return jsonResponse({ error: "PROVIDER_STATUS_UNAVAILABLE" }, 500);
      if (!data) return jsonResponse({ configured: false, provider: null, model: null });
      const config = validateProviderConfig({ provider: data.provider, model: data.model });
      if (!config) return jsonResponse({ configured: false, provider: null, model: null });
      return jsonResponse({
        configured: true,
        provider: config.provider,
        model: config.model,
      });
    }

    if (action === "remove") {
      const { error } = await admin
        .from("user_ai_provider_credentials")
        .delete()
        .eq("user_id", userId);
      if (error) return jsonResponse({ error: "PROVIDER_REMOVE_FAILED" }, 500);
      return jsonResponse({ removed: true });
    }

    if (action !== "test" && action !== "save") {
      return jsonResponse({ error: "INVALID_ACTION" }, 400);
    }

    const config = validateProviderConfig(input);
    const apiKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
    const containsControlCharacter = [...apiKey].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 0x1f || codePoint === 0x7f;
    });
    if (!config || apiKey.length < 8 || apiKey.length > 4096 || containsControlCharacter) {
      return jsonResponse({ error: "INVALID_PROVIDER_CONFIGURATION" }, 400);
    }

    if (action === "test") {
      const providerRequest = buildProviderRequest(
        config,
        apiKey,
        "Reply exactly with OK.",
        [{ role: "user", content: "Reply OK." }],
        false,
        12,
      );
      let providerResponse: Response;
      try {
        const requestOptions = {
          method: "POST",
          headers: providerRequest.headers,
          body: providerRequest.body,
          signal: AbortSignal.timeout(20_000),
          redirect: "error" as const,
        };
        providerResponse = await fetch(providerRequest.url, requestOptions);
      } catch {
        return jsonResponse({ error: "PROVIDER_CONNECTION_FAILED" }, 502);
      }
      if (!providerResponse.ok) {
        const status = providerResponse.status === 429 ? 429 : 400;
        return jsonResponse({ error: status === 429 ? "PROVIDER_RATE_LIMITED" : "PROVIDER_REJECTED_CONFIGURATION" }, status);
      }
      return jsonResponse({ tested: true });
    }

    const encrypted = await encryptApiKey(apiKey, userId, config.provider);
    const { error } = await admin.from("user_ai_provider_credentials").upsert({
      user_id: userId,
      provider: config.provider,
      model: config.model,
      base_url: null,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      key_version: 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) return jsonResponse({ error: "PROVIDER_SAVE_FAILED" }, 500);
    return jsonResponse({ saved: true, provider: config.provider, model: config.model });
  } catch {
    // Never log request bodies, provider responses, encryption material, or raw exceptions.
    return jsonResponse({ error: "PROVIDER_OPERATION_FAILED" }, 500);
  }
});
