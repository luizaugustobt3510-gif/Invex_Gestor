
-- 1. Add new role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fitness_user';

-- 2. Create Invex Fitness company (idempotent)
INSERT INTO public.companies (name, status)
SELECT 'Invex Fitness', 'ativa'
WHERE NOT EXISTS (SELECT 1 FROM public.companies WHERE name = 'Invex Fitness');

-- 3. Activate the invex_fitness module for that company
INSERT INTO public.company_modules (company_id, module_key, is_active)
SELECT id, 'invex_fitness', true
FROM public.companies
WHERE name = 'Invex Fitness'
  AND NOT EXISTS (
    SELECT 1 FROM public.company_modules
    WHERE company_id = companies.id AND module_key = 'invex_fitness'
  );

-- 4. fitness_profiles
CREATE TABLE IF NOT EXISTS public.fitness_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_id uuid NOT NULL,
  nome text NOT NULL DEFAULT '',
  foto_url text,
  avatar_id text NOT NULL DEFAULT 'mei',
  mascote_nome text NOT NULL DEFAULT 'Jax',
  nivel integer NOT NULL DEFAULT 1,
  xp integer NOT NULL DEFAULT 0,
  streak_dias integer NOT NULL DEFAULT 0,
  last_workout_date date,
  peso_atual numeric(6,2),
  altura numeric(5,2),
  meta_peso numeric(6,2),
  meta_freq_semanal integer DEFAULT 4,
  agua_meta_ml integer DEFAULT 2500,
  agua_hoje_ml integer DEFAULT 0,
  agua_data date DEFAULT CURRENT_DATE,
  sono_horas numeric(4,2),
  humor text,
  onboarding_completo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fitness_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own fitness profile select" ON public.fitness_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_super_admin(auth.uid()));
CREATE POLICY "Own fitness profile insert" ON public.fitness_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR is_super_admin(auth.uid()));
CREATE POLICY "Own fitness profile update" ON public.fitness_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR is_super_admin(auth.uid()));
CREATE POLICY "Super admin delete fitness profile" ON public.fitness_profiles
  FOR DELETE TO authenticated USING (is_super_admin(auth.uid()));

CREATE TRIGGER fitness_profiles_updated_at
  BEFORE UPDATE ON public.fitness_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. fitness_workouts (fichas)
CREATE TABLE IF NOT EXISTS public.fitness_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  grupo_muscular text,
  dias_semana int[] DEFAULT '{}',
  cor text DEFAULT '#22d3ee',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fitness_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own workouts all" ON public.fitness_workouts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR is_super_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR is_super_admin(auth.uid()));
CREATE TRIGGER fitness_workouts_updated_at
  BEFORE UPDATE ON public.fitness_workouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. fitness_workout_exercises
CREATE TABLE IF NOT EXISTS public.fitness_workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.fitness_workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  nome text NOT NULL,
  series integer NOT NULL DEFAULT 3,
  repeticoes text NOT NULL DEFAULT '10',
  carga_kg numeric(6,2) DEFAULT 0,
  descanso_seg integer DEFAULT 60,
  midia_url text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fitness_workout_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own exercises all" ON public.fitness_workout_exercises
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR is_super_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR is_super_admin(auth.uid()));

-- 7. fitness_workout_logs
CREATE TABLE IF NOT EXISTS public.fitness_workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workout_id uuid REFERENCES public.fitness_workouts(id) ON DELETE SET NULL,
  data_treino date NOT NULL DEFAULT CURRENT_DATE,
  duracao_min integer,
  exercicios jsonb DEFAULT '[]'::jsonb,
  xp_ganho integer DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fitness_workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own logs all" ON public.fitness_workout_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR is_super_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR is_super_admin(auth.uid()));

-- 8. fitness_measurements
CREATE TABLE IF NOT EXISTS public.fitness_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  data date NOT NULL DEFAULT CURRENT_DATE,
  peso numeric(6,2),
  cintura numeric(5,2),
  quadril numeric(5,2),
  peitoral numeric(5,2),
  braco numeric(5,2),
  coxa numeric(5,2),
  panturrilha numeric(5,2),
  percentual_gordura numeric(5,2),
  foto_url text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fitness_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own measurements all" ON public.fitness_measurements
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR is_super_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR is_super_admin(auth.uid()));

-- 9. fitness_achievements (catálogo público)
CREATE TABLE IF NOT EXISTS public.fitness_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  icone text NOT NULL DEFAULT 'trophy',
  xp_recompensa integer NOT NULL DEFAULT 50,
  raridade text NOT NULL DEFAULT 'comum',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fitness_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated reads achievements" ON public.fitness_achievements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages achievements" ON public.fitness_achievements
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- 10. fitness_user_achievements
CREATE TABLE IF NOT EXISTS public.fitness_user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.fitness_achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);
ALTER TABLE public.fitness_user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own unlocked achievements all" ON public.fitness_user_achievements
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR is_super_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR is_super_admin(auth.uid()));

-- 11. fitness_friends
CREATE TABLE IF NOT EXISTS public.fitness_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_user_id)
);
ALTER TABLE public.fitness_friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own friendships select" ON public.fitness_friends
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_user_id OR is_super_admin(auth.uid()));
CREATE POLICY "Own friendships write" ON public.fitness_friends
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR is_super_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR is_super_admin(auth.uid()));

-- 12. Storage bucket for fitness photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('fitness-photos', 'fitness-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Fitness photos own select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fitness-photos' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_super_admin(auth.uid())));
CREATE POLICY "Fitness photos own insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fitness-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Fitness photos own update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'fitness-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Fitness photos own delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fitness-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 13. Seed achievements
INSERT INTO public.fitness_achievements (codigo, nome, descricao, icone, xp_recompensa, raridade) VALUES
  ('first_workout', 'Primeiro Treino', 'Completou o primeiro treino', 'flame', 100, 'comum'),
  ('streak_3', 'Consistência Inicial', '3 dias seguidos de treino', 'flame', 150, 'comum'),
  ('streak_7', '7 Dias Seguidos', 'Uma semana sem falhar', 'flame', 300, 'rara'),
  ('streak_30', 'Hábito Forjado', '30 dias seguidos de treino', 'crown', 1000, 'lendaria'),
  ('leg_100kg', 'Primeiros 100kg no Leg', 'Levantou 100kg no leg press', 'dumbbell', 250, 'rara'),
  ('cardio_master', 'Mestre do Cardio', '10 sessões de cardio completas', 'heart', 200, 'rara'),
  ('hydration_hero', 'Herói da Hidratação', 'Bateu a meta de água 7 dias', 'droplet', 150, 'comum'),
  ('early_bird', 'Madrugador', 'Treinou antes das 7h', 'sunrise', 100, 'comum'),
  ('weight_goal', 'Meta Atingida', 'Bateu a meta de peso', 'target', 500, 'epica'),
  ('social_butterfly', 'Borboleta Social', 'Adicionou 5 amigos', 'users', 100, 'comum')
ON CONFLICT (codigo) DO NOTHING;
