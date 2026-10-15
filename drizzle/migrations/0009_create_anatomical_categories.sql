CREATE TABLE public.anatomical_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  slug text NOT NULL,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, slug)
);

CREATE INDEX idx_anatomical_categories_company ON public.anatomical_categories (company_id, is_active, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anatomical_categories TO authenticated;
GRANT ALL ON public.anatomical_categories TO service_role;

ALTER TABLE public.anatomical_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY anatomical_categories_select ON public.anatomical_categories
  FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY anatomical_categories_insert ON public.anatomical_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY anatomical_categories_update ON public.anatomical_categories
  FOR UPDATE TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE POLICY anatomical_categories_delete ON public.anatomical_categories
  FOR DELETE TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

CREATE TRIGGER set_anatomical_categories_updated_at
  BEFORE UPDATE ON public.anatomical_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.anatomical_categories (company_id, slug, nome, ordem)
SELECT c.id, s.slug, s.nome, s.ordem
FROM public.companies c
CROSS JOIN (VALUES
  ('cabeca', 'Cabeça', 10),
  ('pescoco', 'Pescoço', 20),
  ('tronco', 'Tronco', 30),
  ('membros_superiores', 'Membros superiores', 40),
  ('membros_inferiores', 'Membros inferiores', 50),
  ('geral', 'Geral', 60)
) AS s(slug, nome, ordem);