
-- ===== Invex Rotina: produto pessoal isolado do Invex Gestor =====
CREATE TABLE public.routine_access (
  user_id uuid PRIMARY KEY,
  nome text,
  email text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','suspenso','revogado')),
  plano text NOT NULL DEFAULT 'gratuito' CHECK (plano IN ('gratuito','premium')),
  premium_status text NOT NULL DEFAULT 'nenhum' CHECK (premium_status IN ('nenhum','ativo','suspenso','expirado')),
  premium_inicio date,
  premium_fim date,
  origem text NOT NULL DEFAULT 'autocadastro',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.routine_access TO authenticated;
GRANT ALL ON public.routine_access TO service_role;
ALTER TABLE public.routine_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rotina_access_own_select" ON public.routine_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "rotina_access_admin_update" ON public.routine_access FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.routine_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  actor_id uuid,
  acao text NOT NULL,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.routine_audit_logs TO authenticated;
GRANT ALL ON public.routine_audit_logs TO service_role;
ALTER TABLE public.routine_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rotina_audit_admin_select" ON public.routine_audit_logs FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Helpers
CREATE OR REPLACE FUNCTION public.routine_has_access(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.routine_access WHERE user_id = _uid AND status = 'ativo')
$$;
CREATE OR REPLACE FUNCTION public.routine_is_premium(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.routine_access WHERE user_id = _uid AND status = 'ativo'
    AND plano = 'premium' AND premium_status = 'ativo'
    AND (premium_fim IS NULL OR premium_fim >= (now() AT TIME ZONE 'America/Sao_Paulo')::date))
$$;

-- Entrada: o próprio usuário só consegue criar o seu acesso gratuito (nunca premium, nunca reativar revogado)
CREATE OR REPLACE FUNCTION public.routine_join() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _st text; _email text; _nome text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT status INTO _st FROM public.routine_access WHERE user_id = _uid;
  IF _st IS NOT NULL THEN RETURN _st; END IF;
  SELECT email, nome INTO _email, _nome FROM public.profiles WHERE user_id = _uid;
  INSERT INTO public.routine_access(user_id, nome, email) VALUES (_uid, _nome, _email);
  INSERT INTO public.routine_audit_logs(target_user_id, actor_id, acao) VALUES (_uid, _uid, 'autocadastro_gratuito');
  RETURN 'ativo';
END $$;
REVOKE ALL ON FUNCTION public.routine_join() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.routine_join() TO authenticated;

-- Concessão manual pelo SuperAdmin (contas já existentes)
CREATE OR REPLACE FUNCTION public.routine_admin_grant(_email text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid; _nome text;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT user_id, nome INTO _uid, _nome FROM public.profiles WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não encontrado'; END IF;
  INSERT INTO public.routine_access(user_id, nome, email, origem) VALUES (_uid, _nome, lower(trim(_email)), 'superadmin')
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.routine_audit_logs(target_user_id, actor_id, acao) VALUES (_uid, auth.uid(), 'acesso_concedido');
  RETURN _uid;
END $$;
REVOKE ALL ON FUNCTION public.routine_admin_grant(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.routine_admin_grant(text) TO authenticated;

-- Auditoria de alterações administrativas
CREATE OR REPLACE FUNCTION public.routine_access_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  INSERT INTO public.routine_audit_logs(target_user_id, actor_id, acao, detalhes)
  VALUES (NEW.user_id, auth.uid(), 'alteracao', jsonb_build_object(
    'status', jsonb_build_array(OLD.status, NEW.status),
    'plano', jsonb_build_array(OLD.plano, NEW.plano),
    'premium_status', jsonb_build_array(OLD.premium_status, NEW.premium_status),
    'premium_fim', jsonb_build_array(OLD.premium_fim, NEW.premium_fim)));
  RETURN NEW;
END $$;
CREATE TRIGGER trg_routine_access_audit BEFORE UPDATE ON public.routine_access
FOR EACH ROW EXECUTE FUNCTION public.routine_access_audit();

-- Dados pessoais
CREATE TABLE public.routine_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  titulo text NOT NULL,
  descricao text,
  data date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  horario time,
  categoria text NOT NULL DEFAULT 'pessoal',
  prioridade text NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta')),
  concluida boolean NOT NULL DEFAULT false,
  recorrencia text NOT NULL DEFAULT 'nenhuma',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.routine_tasks(user_id, data);

CREATE TABLE public.routine_habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  nome text NOT NULL,
  categoria text NOT NULL DEFAULT 'saude',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.routine_habits(user_id);

CREATE TABLE public.routine_habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  habit_id uuid NOT NULL REFERENCES public.routine_habits(id) ON DELETE CASCADE,
  data date NOT NULL,
  UNIQUE (habit_id, data)
);
CREATE INDEX ON public.routine_habit_logs(user_id, data);

CREATE TABLE public.routine_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  titulo text NOT NULL,
  periodo text NOT NULL DEFAULT 'semanal' CHECK (periodo IN ('semanal','mensal')),
  prazo date,
  progresso int NOT NULL DEFAULT 0 CHECK (progresso BETWEEN 0 AND 100),
  concluida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.routine_goals(user_id);

CREATE TABLE public.routine_weekly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  semana_inicio date NOT NULL,
  realizacoes text,
  reflexao text,
  prioridades text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, semana_inicio)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['routine_tasks','routine_habits','routine_habit_logs','routine_goals'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "own_rows" ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid() AND public.routine_has_access(auth.uid())) WITH CHECK (user_id = auth.uid() AND public.routine_has_access(auth.uid()))', t);
  END LOOP;
END $$;

-- Revisão semanal: leitura sempre (dados preservados); escrita só Premium
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_weekly_reviews TO authenticated;
GRANT ALL ON public.routine_weekly_reviews TO service_role;
ALTER TABLE public.routine_weekly_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_select" ON public.routine_weekly_reviews FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.routine_has_access(auth.uid()));
CREATE POLICY "review_insert" ON public.routine_weekly_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.routine_is_premium(auth.uid()));
CREATE POLICY "review_update" ON public.routine_weekly_reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.routine_is_premium(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.routine_is_premium(auth.uid()));
CREATE POLICY "review_delete" ON public.routine_weekly_reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.routine_has_access(auth.uid()));

-- Limites do plano gratuito, verificados no banco
CREATE OR REPLACE FUNCTION public.routine_enforce_limits() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n int;
BEGIN
  IF public.routine_is_premium(NEW.user_id) THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'routine_habits' THEN
    SELECT count(*) INTO _n FROM public.routine_habits WHERE user_id = NEW.user_id AND ativo;
    IF _n >= 5 THEN RAISE EXCEPTION 'LIMITE_GRATUITO: até 5 hábitos no plano gratuito'; END IF;
  ELSIF TG_TABLE_NAME = 'routine_goals' THEN
    SELECT count(*) INTO _n FROM public.routine_goals WHERE user_id = NEW.user_id AND NOT concluida;
    IF _n >= 3 THEN RAISE EXCEPTION 'LIMITE_GRATUITO: até 3 metas ativas no plano gratuito'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_routine_habits_limit BEFORE INSERT ON public.routine_habits FOR EACH ROW EXECUTE FUNCTION public.routine_enforce_limits();
CREATE TRIGGER trg_routine_goals_limit BEFORE INSERT ON public.routine_goals FOR EACH ROW EXECUTE FUNCTION public.routine_enforce_limits();
