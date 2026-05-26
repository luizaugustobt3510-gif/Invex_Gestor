
ALTER TABLE public.fitness_workouts
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + interval '75 days');

ALTER TABLE public.fitness_workout_exercises
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'musculacao',
  ADD COLUMN IF NOT EXISTS duracao_min integer,
  ADD COLUMN IF NOT EXISTS distancia_km numeric,
  ADD COLUMN IF NOT EXISTS calorias integer,
  ADD COLUMN IF NOT EXISTS intensidade text;
