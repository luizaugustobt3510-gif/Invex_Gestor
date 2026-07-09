ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sexo text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS telefone text;