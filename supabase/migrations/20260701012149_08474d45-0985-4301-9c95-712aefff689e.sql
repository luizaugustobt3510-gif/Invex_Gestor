-- Modular architecture: company type + company settings
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS company_type text NOT NULL DEFAULT 'personalizado';

CREATE TABLE IF NOT EXISTS public.company_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view settings" ON public.company_settings;
CREATE POLICY "Company members can view settings"
  ON public.company_settings FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Company admins can insert settings" ON public.company_settings;
CREATE POLICY "Company admins can insert settings"
  ON public.company_settings FOR INSERT
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Company admins can update settings" ON public.company_settings;
CREATE POLICY "Company admins can update settings"
  ON public.company_settings FOR UPDATE
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Company admins can delete settings" ON public.company_settings;
CREATE POLICY "Company admins can delete settings"
  ON public.company_settings FOR DELETE
  USING (public.is_company_admin(auth.uid(), company_id));

DROP TRIGGER IF EXISTS trg_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER trg_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();