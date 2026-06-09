
CREATE TABLE public.fitness_emagrecimento_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  peso numeric NOT NULL CHECK (peso > 0),
  calorias numeric NOT NULL,
  proteinas numeric NOT NULL,
  carboidratos numeric NOT NULL,
  gorduras numeric NOT NULL,
  fibras numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_emagrecimento_logs TO authenticated;
GRANT ALL ON public.fitness_emagrecimento_logs TO service_role;
ALTER TABLE public.fitness_emagrecimento_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.fitness_emagrecimento_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.fitness_emagrecimento_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.fitness_emagrecimento_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_fel_user_date ON public.fitness_emagrecimento_logs(user_id, created_at DESC);
