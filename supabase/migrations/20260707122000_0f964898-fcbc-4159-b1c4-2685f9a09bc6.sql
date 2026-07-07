
-- Company auth methods (per-company)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS auth_methods jsonb NOT NULL
    DEFAULT '{"email": true, "google": false, "microsoft": false}'::jsonb;

-- Profile fields for invite flow & provider tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invite_token text,
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_invite_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS provider_id text,
  ADD COLUMN IF NOT EXISTS last_login timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS cargo text;

-- Public function: allow the login page to check which auth methods
-- a given company (looked up by user email) enables. Returns null if
-- email is not linked. Uses security definer to safely read profiles+companies.
CREATE OR REPLACE FUNCTION public.get_auth_methods_for_email(_email text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.auth_methods
  FROM public.profiles p
  JOIN public.companies c ON c.id = p.company_id
  WHERE lower(p.email) = lower(_email)
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_methods_for_email(text) TO anon, authenticated;
