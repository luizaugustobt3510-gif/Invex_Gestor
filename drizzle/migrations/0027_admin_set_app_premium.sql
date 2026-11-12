CREATE OR REPLACE FUNCTION public.admin_set_app_premium(_user_id uuid, _app text, _ativo boolean, _fim date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _email text; _nome text;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _app NOT IN ('rotina','fitness','financas') THEN RAISE EXCEPTION 'app inválido'; END IF;
  SELECT lower(u.email), COALESCE(p.nome, u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'full_name')
    INTO _email, _nome
    FROM auth.users u LEFT JOIN public.profiles p ON p.user_id = u.id
   WHERE u.id = _user_id;
  IF _email IS NULL THEN RAISE EXCEPTION 'Usuário não encontrado'; END IF;

  IF _app = 'rotina' THEN
    INSERT INTO public.routine_access(user_id, nome, email, origem, plano, premium_status, premium_inicio, premium_fim)
    VALUES (_user_id, _nome, _email, 'superadmin',
            CASE WHEN _ativo THEN 'premium' ELSE 'gratuito' END,
            CASE WHEN _ativo THEN 'ativo' ELSE 'nenhum' END,
            CASE WHEN _ativo THEN (now() AT TIME ZONE 'America/Sao_Paulo')::date END,
            CASE WHEN _ativo THEN _fim END)
    ON CONFLICT (user_id) DO UPDATE SET
      status = 'ativo',
      plano = EXCLUDED.plano,
      premium_status = EXCLUDED.premium_status,
      premium_inicio = CASE WHEN _ativo THEN COALESCE(public.routine_access.premium_inicio, EXCLUDED.premium_inicio) END,
      premium_fim = EXCLUDED.premium_fim,
      updated_at = now();
  ELSIF _app = 'fitness' THEN
    INSERT INTO public.fitness_premium_grants(user_id, email, ativo, fim, granted_by)
    VALUES (_user_id, _email, _ativo, _fim, auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET ativo = EXCLUDED.ativo, fim = EXCLUDED.fim,
      granted_by = EXCLUDED.granted_by, updated_at = now();
  ELSE
    INSERT INTO public.financas_premium_grants(user_id, email, ativo, fim, granted_by)
    VALUES (_user_id, _email, _ativo, _fim, auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET ativo = EXCLUDED.ativo, fim = EXCLUDED.fim,
      granted_by = EXCLUDED.granted_by, updated_at = now();
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.admin_set_app_premium(uuid, text, boolean, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_app_premium(uuid, text, boolean, date) TO authenticated;