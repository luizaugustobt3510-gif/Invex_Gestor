CREATE TABLE public.app_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  produto text NOT NULL DEFAULT 'gestor',
  versao text,
  file_path text NOT NULL,
  file_size bigint,
  ordem int NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_downloads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_downloads TO authenticated;
GRANT ALL ON public.app_downloads TO service_role;
ALTER TABLE public.app_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active downloads" ON public.app_downloads FOR SELECT TO anon, authenticated USING (ativo OR public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin manages downloads" ON public.app_downloads FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
CREATE TRIGGER trg_app_downloads_updated BEFORE UPDATE ON public.app_downloads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Super admin uploads app files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'app-downloads' AND public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin updates app files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'app-downloads' AND public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin deletes app files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'app-downloads' AND public.is_super_admin(auth.uid()));