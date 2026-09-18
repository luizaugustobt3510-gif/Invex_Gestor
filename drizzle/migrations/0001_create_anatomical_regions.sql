CREATE TABLE public.anatomical_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  slug text NOT NULL,
  nome text NOT NULL,
  categoria text NOT NULL DEFAULT 'geral',
  lado text,
  ordem integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX anatomical_regions_company_slug_idx ON public.anatomical_regions (company_id, slug);
CREATE INDEX anatomical_regions_company_idx ON public.anatomical_regions (company_id, categoria, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anatomical_regions TO authenticated;
GRANT ALL ON public.anatomical_regions TO service_role;

ALTER TABLE public.anatomical_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view anatomical regions"
ON public.anatomical_regions FOR SELECT TO authenticated
USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can insert anatomical regions"
ON public.anatomical_regions FOR INSERT TO authenticated
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can update anatomical regions"
ON public.anatomical_regions FOR UPDATE TO authenticated
USING (public.is_company_admin(auth.uid(), company_id))
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Admins can delete anatomical regions"
ON public.anatomical_regions FOR DELETE TO authenticated
USING (public.is_company_admin(auth.uid(), company_id));

CREATE TRIGGER anatomical_regions_updated_at
BEFORE UPDATE ON public.anatomical_regions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();