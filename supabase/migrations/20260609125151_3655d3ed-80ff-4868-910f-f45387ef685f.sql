
CREATE TABLE public.fitness_meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  refeicao TEXT NOT NULL,
  alimento TEXT NOT NULL,
  quantidade_g NUMERIC NOT NULL DEFAULT 0,
  calorias NUMERIC NOT NULL DEFAULT 0,
  proteinas NUMERIC NOT NULL DEFAULT 0,
  carboidratos NUMERIC NOT NULL DEFAULT 0,
  gorduras NUMERIC NOT NULL DEFAULT 0,
  fibras NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_meal_logs TO authenticated;
GRANT ALL ON public.fitness_meal_logs TO service_role;

ALTER TABLE public.fitness_meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own meal logs select" ON public.fitness_meal_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users manage own meal logs insert" ON public.fitness_meal_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users manage own meal logs update" ON public.fitness_meal_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users manage own meal logs delete" ON public.fitness_meal_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_fitness_meal_logs_user_date ON public.fitness_meal_logs(user_id, log_date DESC);
