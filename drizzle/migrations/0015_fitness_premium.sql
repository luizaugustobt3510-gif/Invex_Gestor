CREATE OR REPLACE FUNCTION public.has_product_subscription(_uid uuid, _product text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (_uid = auth.uid() OR auth.uid() IS NULL OR public.is_super_admin(auth.uid()))
   AND EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = _uid AND product_id = _product
    AND ((status IN ('active','trialing','past_due') AND (current_period_end IS NULL OR current_period_end > now()))
      OR (status = 'canceled' AND current_period_end > now())));
$$;
REVOKE ALL ON FUNCTION public.has_product_subscription(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_product_subscription(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.routine_is_premium(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.routine_access WHERE user_id = _uid AND status = 'ativo'
    AND (
      (plano = 'premium' AND premium_status = 'ativo'
        AND (premium_fim IS NULL OR premium_fim >= (now() AT TIME ZONE 'America/Sao_Paulo')::date))
      OR public.has_product_subscription(_uid, 'rotina_premium')
    ))
$$;

CREATE TABLE public.fitness_premium_grants (
  user_id uuid PRIMARY KEY,
  email text,
  ativo boolean NOT NULL DEFAULT true,
  fim date,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_premium_grants TO authenticated;
GRANT ALL ON public.fitness_premium_grants TO service_role;
ALTER TABLE public.fitness_premium_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own grant read" ON public.fitness_premium_grants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "super admin manages grants" ON public.fitness_premium_grants FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.fitness_is_premium(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_uid)
    OR EXISTS (SELECT 1 FROM public.fitness_premium_grants WHERE user_id = _uid AND ativo
         AND (fim IS NULL OR fim >= (now() AT TIME ZONE 'America/Sao_Paulo')::date))
    OR public.has_product_subscription(_uid, 'fitness_premium')
$$;
REVOKE ALL ON FUNCTION public.fitness_is_premium(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fitness_is_premium(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.fitness_admin_grant(_email text, _ativo boolean, _fim date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT user_id INTO _uid FROM public.profiles WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário não encontrado'; END IF;
  INSERT INTO public.fitness_premium_grants(user_id, email, ativo, fim, granted_by)
  VALUES (_uid, lower(trim(_email)), _ativo, _fim, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET ativo = EXCLUDED.ativo, fim = EXCLUDED.fim,
    granted_by = EXCLUDED.granted_by, updated_at = now();
  RETURN _uid;
END $$;
REVOKE ALL ON FUNCTION public.fitness_admin_grant(text, boolean, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fitness_admin_grant(text, boolean, date) TO authenticated;

ALTER TABLE public.fitness_achievements ADD COLUMN IF NOT EXISTS premium boolean NOT NULL DEFAULT false;
UPDATE public.fitness_achievements SET premium = true WHERE codigo IN ('streak_60','workout_50','level_10','hydration_hero');
INSERT INTO public.fitness_achievements(codigo, nome, descricao, xp_recompensa, raridade, premium)
SELECT 'premium_member', 'Membro Premium', 'Assinou o Invex Fitness Premium', 200, 'lendaria', true
WHERE NOT EXISTS (SELECT 1 FROM public.fitness_achievements WHERE codigo = 'premium_member');

CREATE OR REPLACE FUNCTION public.fitness_enforce_premium() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.fitness_is_premium(NEW.user_id) THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'fitness_user_achievements' THEN
    IF EXISTS (SELECT 1 FROM public.fitness_achievements WHERE id = NEW.achievement_id AND premium) THEN
      RAISE EXCEPTION 'Medalha exclusiva Premium';
    END IF;
  ELSIF TG_TABLE_NAME = 'fitness_meal_logs' THEN
    RAISE EXCEPTION 'O plano de alimentação é um recurso Premium';
  ELSIF TG_TABLE_NAME = 'fitness_emagrecimento_logs' THEN
    IF (SELECT count(*) FROM public.fitness_emagrecimento_logs WHERE user_id = NEW.user_id) >= 5 THEN
      RAISE EXCEPTION 'No plano Gratuito o processo de emagrecimento tem até 5 registros';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fitness_enforce_premium() FROM PUBLIC, anon;

CREATE TRIGGER fitness_ach_premium BEFORE INSERT ON public.fitness_user_achievements
  FOR EACH ROW EXECUTE FUNCTION public.fitness_enforce_premium();
CREATE TRIGGER fitness_meal_premium BEFORE INSERT ON public.fitness_meal_logs
  FOR EACH ROW EXECUTE FUNCTION public.fitness_enforce_premium();
CREATE TRIGGER fitness_emag_premium BEFORE INSERT ON public.fitness_emagrecimento_logs
  FOR EACH ROW EXECUTE FUNCTION public.fitness_enforce_premium();