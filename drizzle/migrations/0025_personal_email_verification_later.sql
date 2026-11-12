CREATE TABLE public.personal_email_verifications (
  user_id uuid PRIMARY KEY,
  verified_at timestamptz NOT NULL DEFAULT now(),
  method text NOT NULL
);
GRANT SELECT ON public.personal_email_verifications TO authenticated;
GRANT ALL ON public.personal_email_verifications TO service_role;
ALTER TABLE public.personal_email_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own email verification readable"
  ON public.personal_email_verifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Contas que já existiam e já tinham confirmado o e-mail contam como confirmadas
INSERT INTO public.personal_email_verifications (user_id, verified_at, method)
SELECT id, COALESCE(email_confirmed_at, now()), 'legacy'
FROM auth.users WHERE email_confirmed_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Status da confirmação de e-mail das contas pessoais. Marca como confirmada quando
-- a sessão atual veio de um link enviado ao e-mail (magic link / recuperação) ou de login social.
CREATE OR REPLACE FUNCTION public.personal_email_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _created timestamptz;
  _providers jsonb;
  _amr jsonb := COALESCE(auth.jwt()->'amr', '[]'::jsonb);
  _method text;
  _verified timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT created_at, COALESCE(raw_app_meta_data->'providers', '[]'::jsonb)
    INTO _created, _providers FROM auth.users WHERE id = _uid;

  SELECT verified_at INTO _verified FROM public.personal_email_verifications WHERE user_id = _uid;

  IF _verified IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid) THEN
      _method := 'company';
    ELSIF _providers ?| array['google','azure','apple'] THEN
      _method := 'oauth';
    ELSIF EXISTS (SELECT 1 FROM jsonb_array_elements(_amr) a
                  WHERE a->>'method' IN ('otp','magiclink','recovery','email/signup','email_change','invite')) THEN
      _method := 'email_link';
    END IF;
    IF _method IS NOT NULL THEN
      INSERT INTO public.personal_email_verifications (user_id, method) VALUES (_uid, _method)
      ON CONFLICT (user_id) DO NOTHING;
      _verified := now();
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'verified', _verified IS NOT NULL,
    'created_at', _created,
    'deadline', _created + interval '7 days'
  );
END $$;
REVOKE ALL ON FUNCTION public.personal_email_status() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.personal_email_status() TO authenticated;