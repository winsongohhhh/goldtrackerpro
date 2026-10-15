# Gold Advisor BYOK function notes

Both `gold-advisor-chat` and `gold-advisor-provider` use the signed-in user's JWT and a server-side service-role client. Personal provider keys are AES-GCM encrypted before database writes and decrypted only inside the Edge Function that calls the provider.

Required release setup (not performed here):

1. Apply `supabase/migrations/20261014100000_user_ai_provider_credentials.sql` through the approved migration workflow.
2. Configure the `AI_PROVIDER_ENCRYPTION_KEY` Edge Function secret as a base64-encoded, randomly generated 32-byte key. The same secret must be set for both functions and preserved for decrypting existing rows; rotation requires an explicit re-encryption plan.
3. Confirm the Supabase-provided `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are available to Edge Functions.
4. Deploy both function sources only after approval and run provider-key, isolation, and streaming smoke tests.

The browser roles have no table privileges and no RLS policy. The functions return only supported provider/model metadata, never ciphertext or API keys. `GEMINI_API_KEY` is not used as a fallback. Only the fixed OpenAI, Anthropic, and Google Gemini endpoints are supported. Arbitrary OpenAI-compatible URLs are intentionally disabled until a dedicated egress proxy can pin validated public IPs and block private-network access.
