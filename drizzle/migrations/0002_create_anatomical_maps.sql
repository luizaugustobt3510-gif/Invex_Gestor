CREATE TABLE public.anatomical_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'geral',
  vista TEXT NOT NULL DEFAULT 'frente',
  image_path TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anatomical_maps TO authenticated;
GRANT ALL ON public.anatomical_maps TO service_role;

ALTER TABLE public.anatomical_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anatomical_maps_select" ON public.anatomical_maps
  FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "anatomical_maps_write" ON public.anatomical_maps
  FOR ALL TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE INDEX idx_anatomical_maps_company ON public.anatomical_maps (company_id, categoria, ordem);

CREATE TRIGGER trg_anatomical_maps_updated
  BEFORE UPDATE ON public.anatomical_maps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.anatomical_map_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  map_id UUID NOT NULL REFERENCES public.anatomical_maps(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES public.anatomical_regions(id) ON DELETE CASCADE,
  points JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.anatomical_map_regions TO authenticated;
GRANT ALL ON public.anatomical_map_regions TO service_role;

ALTER TABLE public.anatomical_map_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anatomical_map_regions_select" ON public.anatomical_map_regions
  FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "anatomical_map_regions_write" ON public.anatomical_map_regions
  FOR ALL TO authenticated
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

CREATE INDEX idx_anatomical_map_regions_map ON public.anatomical_map_regions (map_id);

CREATE TRIGGER trg_anatomical_map_regions_updated
  BEFORE UPDATE ON public.anatomical_map_regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();