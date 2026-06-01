-- Tabela de atualizações do sistema
CREATE TABLE public.system_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  versao text NOT NULL,
  titulo text NOT NULL,
  data_atualizacao date NOT NULL DEFAULT CURRENT_DATE,
  descricao text NOT NULL DEFAULT '',
  novas_funcionalidades jsonb NOT NULL DEFAULT '[]'::jsonb,
  correcoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'rascunho',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_updates TO authenticated;
GRANT ALL ON public.system_updates TO service_role;

ALTER TABLE public.system_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view published updates"
ON public.system_updates FOR SELECT TO authenticated
USING (status = 'publicada' OR is_super_admin(auth.uid()));

CREATE POLICY "Super admin manages updates insert"
ON public.system_updates FOR INSERT TO authenticated
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admin manages updates update"
ON public.system_updates FOR UPDATE TO authenticated
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admin manages updates delete"
ON public.system_updates FOR DELETE TO authenticated
USING (is_super_admin(auth.uid()));

CREATE TRIGGER trg_system_updates_updated_at
BEFORE UPDATE ON public.system_updates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_system_updates_status_data ON public.system_updates (status, data_atualizacao DESC);

-- Visualizações por usuário
CREATE TABLE public.user_update_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  update_id uuid NOT NULL REFERENCES public.system_updates(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, update_id)
);

GRANT SELECT, INSERT, DELETE ON public.user_update_views TO authenticated;
GRANT ALL ON public.user_update_views TO service_role;

ALTER TABLE public.user_update_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own update views select"
ON public.user_update_views FOR SELECT TO authenticated
USING (auth.uid() = user_id OR is_super_admin(auth.uid()));

CREATE POLICY "Own update views insert"
ON public.user_update_views FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own update views delete"
ON public.user_update_views FOR DELETE TO authenticated
USING (auth.uid() = user_id OR is_super_admin(auth.uid()));

CREATE INDEX idx_user_update_views_user ON public.user_update_views (user_id);