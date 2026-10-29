CREATE TABLE public.routine_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  titulo text NOT NULL DEFAULT '',
  conteudo text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.routine_notes(user_id);
CREATE TABLE public.routine_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  titulo text NOT NULL,
  lembrar_em timestamptz NOT NULL,
  concluido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.routine_reminders(user_id, lembrar_em);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['routine_notes','routine_reminders'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "own_rows" ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid() AND public.routine_has_access(auth.uid())) WITH CHECK (user_id = auth.uid() AND public.routine_has_access(auth.uid()))', t);
  END LOOP;
END $$;