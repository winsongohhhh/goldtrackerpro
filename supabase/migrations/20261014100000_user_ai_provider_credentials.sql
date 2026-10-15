-- Stores provider credentials only as AES-GCM ciphertext. The encryption key is held
-- exclusively in the Edge Function environment as AI_PROVIDER_ENCRYPTION_KEY.
CREATE TABLE public.user_ai_provider_credentials (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google')),
  model text NOT NULL CHECK (char_length(model) BETWEEN 1 AND 120),
  base_url text CHECK (base_url IS NULL),
  ciphertext text NOT NULL,
  iv text NOT NULL,
  key_version smallint NOT NULL DEFAULT 1 CHECK (key_version = 1),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_ai_provider_credentials ENABLE ROW LEVEL SECURITY;

-- Reads and writes are performed only by authenticated Edge Functions using service_role.
-- No RLS policy is intentionally defined for anon or authenticated users.
REVOKE ALL ON TABLE public.user_ai_provider_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.user_ai_provider_credentials TO service_role;
