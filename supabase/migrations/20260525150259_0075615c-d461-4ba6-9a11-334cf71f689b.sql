
ALTER TABLE public.fitness_profiles ADD COLUMN IF NOT EXISTS meta_sono_horas numeric(4,2) DEFAULT 8;

CREATE TABLE IF NOT EXISTS public.fitness_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  sono_horas numeric(4,2),
  humor text,
  agua_ml integer DEFAULT 0,
  treino_feito boolean DEFAULT false,
  peso numeric(6,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, data)
);

CREATE INDEX IF NOT EXISTS idx_fitness_daily_logs_user_date ON public.fitness_daily_logs(user_id, data DESC);

ALTER TABLE public.fitness_daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own daily log select" ON public.fitness_daily_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_super_admin(auth.uid()));
CREATE POLICY "Own daily log insert" ON public.fitness_daily_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own daily log update" ON public.fitness_daily_logs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Own daily log delete" ON public.fitness_daily_logs FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_super_admin(auth.uid()));

CREATE TRIGGER fitness_daily_logs_updated_at
  BEFORE UPDATE ON public.fitness_daily_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
