-- Registro de quais apps pessoais (Rotina, Fitness, Finanças) cada conta usa
CREATE TABLE public.personal_app_usage (
  user_id uuid NOT NULL,
  app text NOT NULL CHECK (app IN ('rotina','fitness','financas')),
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, app)
);
GRANT SELECT ON public.personal_app_usage TO authenticated;
GRANT ALL ON public.personal_app_usage TO service_role;
ALTER TABLE public.personal_app_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own app usage readable" ON public.personal_app_usage
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- Marca o uso de um app pela conta logada (único caminho de escrita)
CREATE OR REPLACE FUNCTION public.personal_touch_app(_app text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _app NOT IN ('rotina','fitness','financas') THEN RAISE EXCEPTION 'app inválido'; END IF;
  INSERT INTO public.personal_app_usage (user_id, app) VALUES (auth.uid(), _app)
  ON CONFLICT (user_id, app) DO UPDATE SET last_seen = now()
  WHERE personal_app_usage.last_seen < now() - interval '10 minutes';
END $$;
REVOKE ALL ON FUNCTION public.personal_touch_app(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.personal_touch_app(text) TO authenticated;

-- Preenche com o uso que já existe
INSERT INTO public.personal_app_usage (user_id, app, first_seen, last_seen)
SELECT user_id, 'rotina', created_at, created_at FROM public.routine_access
ON CONFLICT DO NOTHING;
INSERT INTO public.personal_app_usage (user_id, app, first_seen, last_seen)
SELECT user_id, 'fitness', created_at, COALESCE(updated_at, created_at) FROM public.fitness_profiles
ON CONFLICT DO NOTHING;
INSERT INTO public.personal_app_usage (user_id, app, first_seen, last_seen)
SELECT user_id, 'financas', min(created_at), max(created_at) FROM (
  SELECT user_id, created_at FROM public.personal_transactions
  UNION ALL SELECT user_id, created_at FROM public.personal_categories
) s GROUP BY user_id
ON CONFLICT DO NOTHING;

-- Lista de contas dos apps pessoais para o Super Admin (sem dados financeiros/treinos)
CREATE OR REPLACE FUNCTION public.admin_personal_accounts()
RETURNS TABLE (
  user_id uuid, nome text, email text, created_at timestamptz, last_sign_in_at timestamptz,
  login_google boolean, email_confirmado boolean, tem_empresa boolean, empresa text,
  usa_rotina boolean, usa_fitness boolean, usa_financas boolean,
  rotina_premium boolean, fitness_premium boolean, financas_premium boolean,
  telefone text, cidade text, uf text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'acesso negado'; END IF;
  RETURN QUERY
  SELECT u.id,
    COALESCE(p.nome, u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'full_name')::text,
    u.email::text, u.created_at, u.last_sign_in_at,
    COALESCE(u.raw_app_meta_data->'providers', '[]'::jsonb) ? 'google',
    EXISTS (SELECT 1 FROM public.personal_email_verifications v WHERE v.user_id = u.id),
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id),
    (SELECT c.name FROM public.user_roles r JOIN public.companies c ON c.id = r.company_id WHERE r.user_id = u.id LIMIT 1)::text,
    EXISTS (SELECT 1 FROM public.personal_app_usage a WHERE a.user_id = u.id AND a.app = 'rotina'),
    EXISTS (SELECT 1 FROM public.personal_app_usage a WHERE a.user_id = u.id AND a.app = 'fitness'),
    EXISTS (SELECT 1 FROM public.personal_app_usage a WHERE a.user_id = u.id AND a.app = 'financas'),
    public.routine_is_premium(u.id), public.fitness_is_premium(u.id), public.financas_is_premium(u.id),
    p.telefone::text, p.cidade::text, p.uf::text
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE EXISTS (SELECT 1 FROM public.personal_app_usage a WHERE a.user_id = u.id)
     OR NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
  ORDER BY u.created_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.admin_personal_accounts() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_personal_accounts() TO authenticated;